import { HINTS, I } from '../../content/he/instructions'
import { equation } from '../helpers'
import type { Difficulty, GeneratorFn, Rng } from '../types'

export const tens: GeneratorFn = (d, rng) => {
  const sub = rng.next() < 0.5
  const a = rng.int(d === 1 ? 1 : 2, 9) * 10
  const b = sub ? rng.int(1, a / 10) * 10 : rng.int(1, 10 - a / 10) * 10
  if (!sub && a + b > 100) return tens(d, rng)
  return { ...equation(a, sub ? '-' : '+', b), instruction: I.solve, icon: 'pencil', hint: HINTS.tens }
}

/** Two-digit ± one-digit (or round tens at d=3), without regrouping. */
export const addSubNoRegroup: GeneratorFn = (d, rng) => {
  const sub = rng.next() < 0.5
  const a = rng.int(2, 9) * 10 + rng.int(sub ? 2 : 0, sub ? 9 : 7)
  let b: number
  if (d === 3 && rng.next() < 0.5) b = rng.int(1, sub ? Math.floor(a / 10) - 1 : 9 - Math.floor(a / 10)) * 10 || 10
  else b = sub ? rng.int(1, a % 10) : rng.int(1, 9 - (a % 10))
  if (!sub && a + b > 99) return addSubNoRegroup(d, rng)
  return {
    ...equation(a, sub ? '-' : '+', b),
    instruction: I.solve,
    icon: 'pencil',
    hint: HINTS.noRegroup,
    hintVisual: { kind: 'blocks', hundreds: 0, tens: Math.floor(a / 10), ones: a % 10 },
  }
}

/** Two-digit ± one-digit with regrouping: 45 + 9, 72 − 6, 30 − 7. */
export const addSubRegroup: GeneratorFn = (d, rng) => {
  const sub = rng.next() < 0.5
  if (sub) {
    const round = d === 3 && rng.next() < 0.5
    const a = round ? rng.int(2, 9) * 10 : rng.int(2, 9) * 10 + rng.int(0, d === 1 ? 4 : 8)
    const b = rng.int((a % 10) + 1, 9)
    return {
      ...equation(a, '-', b),
      instruction: I.solve,
      icon: 'pencil',
      hint: HINTS.regroupSub,
      hintVisual: { kind: 'blocks', hundreds: 0, tens: Math.floor(a / 10), ones: a % 10 },
    }
  }
  const a = rng.int(1, 8) * 10 + rng.int(d === 1 ? 5 : 2, 9)
  const b = rng.int(10 - (a % 10), 9)
  return {
    ...equation(a, '+', b),
    instruction: I.solve,
    icon: 'pencil',
    hint: HINTS.regroupAdd,
    hintVisual: { kind: 'blocks', hundreds: 0, tens: Math.floor(a / 10), ones: a % 10 },
  }
}

function twoDigitPair(d: Difficulty, rng: Rng): { a: number; b: number; sub: boolean } {
  if (d === 1) {
    const sub = rng.next() < 0.5
    const a = rng.int(2, 8) * 10 + rng.int(sub ? 3 : 0, sub ? 9 : 6)
    const b = sub
      ? rng.int(1, Math.floor(a / 10) - 1) * 10 + rng.int(0, a % 10)
      : rng.int(1, 9 - Math.floor(a / 10)) * 10 + rng.int(0, 9 - (a % 10))
    return { a, b, sub }
  }
  if (d === 2) {
    const a = rng.int(1, 7) * 10 + rng.int(3, 9)
    const bo = rng.int(10 - (a % 10), 9)
    const bt = rng.int(1, Math.max(1, 8 - Math.floor(a / 10)))
    return { a, b: bt * 10 + bo, sub: false }
  }
  const a = rng.int(3, 9) * 10 + rng.int(0, 7)
  const b = rng.int(1, Math.floor(a / 10) - 1) * 10 + rng.int((a % 10) + 1, 9)
  return { a, b, sub: true }
}

/** Two two-digit numbers: 12 + 17, 34 + 26, 70 − 18. */
export const twoDigit: GeneratorFn = (d, rng) => {
  const { a, b, sub } = twoDigitPair(d, rng)
  return {
    ...equation(a, sub ? '-' : '+', b),
    instruction: I.solve,
    icon: 'pencil',
    hint: d === 1 ? HINTS.noRegroup : sub ? HINTS.regroupSub : HINTS.regroupAdd,
    hintVisual: { kind: 'blocks', hundreds: 0, tens: Math.floor(a / 10), ones: a % 10 },
  }
}

export const column: GeneratorFn = (d, rng) => {
  const { a, b, sub } = twoDigitPair(d, rng)
  const eq = equation(a, sub ? '-' : '+', b)
  return {
    answers: eq.answers,
    meta: eq.meta,
    answerType: 'number',
    visual: { kind: 'column', a, b, op: sub ? '-' : '+' },
    instruction: I.solveColumn,
    icon: 'pencil',
    hint: d === 1 ? HINTS.noRegroup : sub ? HINTS.regroupSub : HINTS.regroupAdd,
  }
}
