// @vitest-environment jsdom
/**
 * Every exercise type the app can produce (each topic, level, skill and difficulty, which is what
 * practice, level tests and placement draw from) must offer a usable input, and the correct answer
 * must be enterable both on the keypad and by handwriting, with the real digit model.
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { tx } from '../content/he/text'
import { TOPICS } from '../curriculum/topics'
import { answerSlots, blankCount } from '../exercises/answerFormat'
import { generateExercise, SKILLS } from '../exercises/registry'
import { createRng } from '../exercises/rng'
import type { Exercise } from '../exercises/types'
import { strokeSample } from '../handwriting/testing/strokeSamples'
import { LESSONS } from '../lessons/lessons'
import { ExerciseView } from './ExerciseView'

vi.mock('../app/AppContext', () => ({
  useApp: () => ({ t: (x: Parameters<typeof tx>[0]) => tx(x, 'f'), gender: 'f', setProfileId: () => {}, reducedMotion: true }),
}))
vi.mock('../data/db', () => ({ addDigitSample: vi.fn() }))
vi.mock('../handwriting/classifier', async (orig) => {
  const { loadModelFromDisk } = await import('../handwriting/testing/loadModel')
  return { ...(await orig<object>()), loadClassifier: () => loadModelFromDisk() }
})

beforeAll(async () => {
  HTMLCanvasElement.prototype.getContext = (() => null) as never
  if (!('PointerEvent' in window)) {
    class PointerEvent extends MouseEvent {
      pointerId: number
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 1
      }
    }
    ;(window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEvent
  }
  const { loadModelFromDisk } = await import('../handwriting/testing/loadModel')
  await loadModelFromDisk()
}, 60_000)

afterEach(cleanup)

function allExercises(): Exercise[] {
  const out: Exercise[] = []
  const rng = createRng(4003)
  for (const topic of TOPICS) {
    topic.levels.forEach((lv, li) => {
      for (const skillId of lv.skills) {
        for (const d of [1, 2, 3]) {
          for (let k = 0; k < 2; k++) out.push(generateExercise(topic.id, li + 1, d, rng, { skillId }))
        }
      }
    })
  }
  return out
}

const EXERCISES = allExercises()
const label = (ex: Exercise) => `${ex.topicId} L${ex.level} ${ex.skillId} d${ex.difficulty}: ${JSON.stringify(ex.tokens?.map((t) => ('v' in t ? t.v : '□')) ?? ex.instruction)} → ${ex.answers.join(',')}`

const view = (ex: Exercise, hand: boolean) => render(<ExerciseView exercise={ex} mode="practice" guide="princess" onDone={() => {}} handwritingDefault={hand} />)

const selectBlank = (i: number) => {
  const blank = screen.queryByRole('button', { name: new RegExp(`^תשובה ${i + 1}`) })
  if (blank) fireEvent.click(blank)
}

async function expectCorrect() {
  fireEvent.click(screen.getByRole('button', { name: /בְּדִיקָה/ }))
  await waitFor(() => expect(document.querySelector('.sheet.good')).not.toBeNull())
}

async function draw(canvas: Element, digit: number) {
  const pts = strokeSample(digit, 0, 3, { jitter: 0 })
  let id = -1
  for (const p of pts) {
    if (p.id !== id) {
      if (id >= 0) fireEvent.pointerUp(canvas, { pointerId: 1 })
      id = p.id
      fireEvent.pointerDown(canvas, { clientX: p.x, clientY: p.y, pointerId: 1 })
    } else fireEvent.pointerMove(canvas, { clientX: p.x, clientY: p.y, pointerId: 1 })
  }
  fireEvent.pointerUp(canvas, { pointerId: 1 })
}

describe('every exercise has a usable input', () => {
  it('covers all skills in the curriculum', () => {
    const covered = new Set(EXERCISES.map((e) => e.skillId))
    const used = new Set(TOPICS.flatMap((t) => t.levels.flatMap((l) => l.skills)))
    expect([...used].filter((s) => !covered.has(s))).toEqual([])
    expect([...used].filter((s) => !SKILLS[s])).toEqual([])
  })

  it.each(EXERCISES.map((e) => [label(e), e] as const))('keypad: %s', async (_, ex) => {
    view(ex, false)
    if (ex.answerType === 'choice') {
      const choices = document.querySelectorAll<HTMLButtonElement>('.choices .choice')
      expect(choices.length).toBe(ex.choices!.length)
      choices.forEach((c) => expect(c.disabled).toBe(false))
      fireEvent.click(choices[ex.choices!.findIndex((c) => c.value === ex.answers[0])])
      await waitFor(() => expect(document.querySelector('.sheet.good')).not.toBeNull())
      return
    }
    const keypad = screen.getByRole('group', { name: 'מקלדת מספרים' })
    expect(document.querySelector('.hand-pad')).toBeNull()
    const answers = ex.answers.slice(0, blankCount(ex))
    expect(answers.length).toBe(blankCount(ex))
    answers.forEach((a, i) => {
      selectBlank(i)
      for (const ch of String(a)) fireEvent.click(within(keypad).getByRole('button', { name: ch }))
    })
    await expectCorrect()
  })
})

describe('handwriting', () => {
  const oneEach = [...new Map(EXERCISES.filter((e) => e.answerType === 'number').map((e) => [`${e.skillId}`, e])).values()]

  it.each(oneEach.map((e) => [label(e), e] as const))('writes the answer: %s', async (_, ex) => {
    view(ex, true)
    expect(screen.queryByRole('group', { name: 'מקלדת מספרים' })).toBeNull()
    const slots = answerSlots(ex)
    for (let i = 0; i < blankCount(ex); i++) {
      selectBlank(i)
      const digits = String(ex.answers[i]).split('').map(Number)
      let canvases = document.querySelectorAll('.hand-pad canvas')
      expect(canvases.length).toBe(slots[i])
      expect(canvases.length).toBeGreaterThanOrEqual(digits.length)
      // Written left to right; boxes after the number stay empty.
      for (let k = 0; k < digits.length; k++) await act(() => draw(canvases[k], digits[k]))
      await waitFor(() => expect(document.querySelectorAll('.hand-pad .recognized').length).toBe(digits.length), { timeout: 4000 })
      canvases = document.querySelectorAll('.hand-pad canvas')
      const read = [...document.querySelectorAll('.hand-pad .recognized')].map((r) => r.textContent).join('')
      expect(read, 'recognized digits').toBe(String(ex.answers[i]))
    }
    await expectCorrect()
  }, 20_000)
})

describe('answer boxes', () => {
  it('depend only on the skill, never on the answer, and always fit the answer', () => {
    const rng = createRng(77)
    for (const skillId of Object.keys(SKILLS)) {
      const seen = new Set<string>()
      for (const d of [1, 2, 3] as const) {
        for (let k = 0; k < 40; k++) {
          const ex = { ...SKILLS[skillId](d, rng), id: 'x', topicId: 'add-sub-20', skillId, level: 1, difficulty: d } as Exercise
          if (ex.answerType === 'choice') continue
          const slots = answerSlots(ex)
          seen.add(slots.join(','))
          ex.answers.slice(0, blankCount(ex)).forEach((a, i) => expect(slots[i], `${skillId} ${a}`).toBeGreaterThanOrEqual(String(a).length))
          slots.forEach((s) => expect(s).toBeGreaterThanOrEqual(2))
        }
      }
      expect(seen.size, skillId).toBeLessThanOrEqual(1)
    }
  })

  it('shows two boxes for 7 + 4 = 11 and lets a second digit be added when more are needed', async () => {
    const ex = { ...SKILLS.add20(1, createRng(1)), id: 'x', topicId: 'add-sub-20', skillId: 'add20', level: 1, difficulty: 1 } as Exercise
    view({ ...ex, tokens: [{ t: 'n', v: 7 }, { t: 'op', v: '+' }, { t: 'n', v: 4 }, { t: 'op', v: '=' }, { t: 'blank', i: 0 }], answers: [11] }, true)
    expect(document.querySelectorAll('.hand-pad canvas').length).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 'הוספת ספרה' }))
    expect(document.querySelectorAll('.hand-pad canvas').length).toBe(3)
  })
})

describe('lessons', () => {
  it('every slide that shows a blank can be answered', () => {
    for (const [topic, slides] of Object.entries(LESSONS)) {
      slides.forEach((s, i) => {
        if (!s.tokens?.some((t) => t.t === 'blank')) return
        expect(s.ask, `${topic} slide ${i + 1}`).toBeDefined()
        expect(s.ask!.choices).toContain(s.ask!.answer)
      })
    }
  })
})
