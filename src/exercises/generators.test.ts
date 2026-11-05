import { describe, expect, it } from 'vitest'
import * as instructions from '../content/he/instructions'
import { hasNikud, tx } from '../content/he/text'
import { TOPICS } from '../curriculum/topics'
import { toHebrewLetters } from './gen/t2-numbers-1000'
import { timeWords } from './gen/t8-measurement'
import { checkAnswer, generateExercise, SKILLS } from './registry'
import { createRng } from './rng'
import type { Difficulty } from './types'

const rng = createRng(42)

describe('every level of every topic generates valid exercises', () => {
  for (const topic of TOPICS) {
    topic.levels.forEach((level, li) => {
      it(`${topic.id} level ${li + 1}`, () => {
        for (const d of [1, 2, 3] as Difficulty[]) {
          for (let i = 0; i < 60; i++) {
            const ex = generateExercise(topic.id, li + 1, d, rng)
            expect(level.skills).toContain(ex.skillId)
            for (const gender of ['f', 'm'] as const) {
              const text = tx(ex.instruction, gender)
              expect(text.length).toBeGreaterThan(3)
              expect(hasNikud(text)).toBe(true)
              expect(text.normalize('NFC')).toBe(text)
            }
            expect(checkAnswer(ex, ex.answers)).toBe(true)
            if (ex.answerType === 'choice') {
              const values = ex.choices!.map((c) => c.value)
              expect(values).toContain(ex.answers[0])
              expect(new Set(values).size).toBe(values.length)
            } else {
              for (const a of ex.answers) {
                expect(Number.isInteger(a)).toBe(true)
                expect(a).toBeGreaterThanOrEqual(0)
                expect(a).toBeLessThan(1000)
              }
              const blanks = ex.tokens?.filter((t) => t.t === 'blank').length ?? 1
              expect(Math.max(blanks, 1)).toBe(ex.answers.length)
            }
            if (ex.meta?.a !== undefined) expect(ex.meta.a).toBeGreaterThanOrEqual(0)
          }
        }
      })
    })
  }
})

it('every skill referenced by the curriculum exists', () => {
  for (const t of TOPICS) for (const l of t.levels) for (const s of l.skills) expect(SKILLS[s]).toBeTypeOf('function')
})

it('keeps sums and differences in range for the to-20 topic', () => {
  for (let i = 0; i < 300; i++) {
    const ex = generateExercise('add-sub-20', 2, 3, rng)
    if (ex.meta?.result !== undefined) {
      expect(ex.meta.result).toBeLessThanOrEqual(20)
      expect(ex.meta.result).toBeGreaterThanOrEqual(0)
    }
  }
})

it('write-an-exercise accepts any correct pair', () => {
  const ex = SKILLS.writeExercise(2, createRng(1))
  const target = (ex.tokens!.at(-1) as { v: number }).v
  expect(ex.validate!([target - 2, 2])).toBe(true)
  expect(ex.validate!([target, 1])).toBe(false)
})

it('writes Hebrew letter numbers and times correctly', () => {
  expect(toHebrewLetters(1)).toBe('א׳')
  expect(toHebrewLetters(12)).toBe('י״ב')
  expect(toHebrewLetters(15)).toBe('ט״ו')
  expect(toHebrewLetters(16)).toBe('ט״ז')
  expect(toHebrewLetters(39)).toBe('ל״ט')
  expect(timeWords(3, 30)).toBe('שָׁלוֹשׁ וָחֵצִי')
  expect(timeWords(3, 45)).toBe('רֶבַע לְאַרְבַּע')
  expect(timeWords(12, 45)).toBe('רֶבַע לְאַחַת')
})

it('all fixed instruction and hint strings are vocalized', () => {
  const strings: string[] = []
  const collect = (v: unknown) => {
    if (typeof v === 'string') strings.push(v)
    else if (typeof v === 'function') {
      const out = (v as (...a: number[]) => unknown)(5, 7)
      collect(out)
    } else if (v && typeof v === 'object') Object.values(v).forEach(collect)
  }
  collect(instructions.I)
  collect(instructions.HINTS)
  for (const s of strings) {
    if (/[\u05D0-\u05EA]{3,}/.test(s)) expect(hasNikud(s), s).toBe(true)
  }
})
