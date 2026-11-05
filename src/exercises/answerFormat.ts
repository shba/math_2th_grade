import { SKILLS } from './registry'
import { createRng } from './rng'
import type { Exercise } from './types'

export const MAX_DIGITS = 4
const SAMPLES_PER_DIFFICULTY = 150
const cache = new Map<string, number[]>()

export function blankCount(ex: Exercise) {
  if (ex.answerType === 'choice') return 0
  return Math.max(1, ex.tokens?.filter((t) => t.t === 'blank').length ?? 1)
}

/**
 * How many digit boxes to show for each blank. This depends only on the skill (the largest
 * answer its generator produces at any difficulty), never on the current answer, so the
 * number of boxes gives nothing away. Extra boxes may be left empty, and the pad can add one.
 */
export function answerSlots(ex: Exercise): number[] {
  const n = blankCount(ex)
  const key = `${ex.skillId}:${n}`
  let slots = cache.get(key)
  if (!slots) {
    const gen = SKILLS[ex.skillId]
    const max = Array<number>(n).fill(0)
    if (gen) {
      const rng = createRng(20260705)
      for (const d of [1, 2, 3] as const) {
        for (let k = 0; k < SAMPLES_PER_DIFFICULTY; k++) {
          const e = gen(d, rng)
          e.answers.forEach((a, i) => {
            if (i < n) max[i] = Math.max(max[i], Math.abs(a))
          })
        }
      }
    }
    slots = max.map((m) => Math.min(MAX_DIGITS, Math.max(2, String(Math.floor(m)).length)))
    cache.set(key, slots)
  }
  return slots
}

/** Joins the digits written left to right, skipping boxes left empty. */
export function joinDigits(digits: (number | null)[]): string {
  return digits.filter((d): d is number => d !== null).join('')
}
