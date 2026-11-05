import { HINTS, I, W } from '../../content/he/instructions'
import { blank, equation, n, op } from '../helpers'
import type { GeneratorFn, Rng } from '../types'

const ITEMS = [
  { icon: '🌸', word: W.flowers },
  { icon: '🐟', word: W.fish },
  { icon: '⭐', word: W.stars },
  { icon: '🍎', word: W.apples },
] as const

const pickItem = (rng: Rng) => rng.pick(ITEMS)

export const add10: GeneratorFn = (d, rng) => {
  const r = rng.int(d === 1 ? 3 : 5, 10)
  const a = rng.int(1, r - 1)
  const b = r - a
  const it = pickItem(rng)
  return {
    ...equation(a, '+', b),
    instruction: I.solve,
    icon: 'pencil',
    visual: d < 3 ? { kind: 'items', icon: it.icon, count: a + b, added: b } : undefined,
    hint: HINTS.countOn,
    hintVisual: { kind: 'items', icon: it.icon, count: a + b, added: b },
  }
}

export const sub10: GeneratorFn = (d, rng) => {
  const a = rng.int(d === 1 ? 3 : 5, 10)
  const b = rng.int(1, a - 1)
  const it = pickItem(rng)
  return {
    ...equation(a, '-', b),
    instruction: I.solve,
    icon: 'pencil',
    visual: d < 3 ? { kind: 'items', icon: it.icon, count: a, crossed: b } : undefined,
    hint: HINTS.countBack,
    hintVisual: { kind: 'items', icon: it.icon, count: a, crossed: b },
  }
}

export const add20: GeneratorFn = (d, rng) => {
  let a: number, b: number
  if (d === 1) {
    a = 10 + rng.int(0, 7)
    b = rng.int(1, 19 - a)
  } else if (d === 2) {
    a = rng.int(5, 9)
    b = rng.int(11 - a, 9)
  } else {
    const kind = rng.int(0, 2)
    if (kind === 0) {
      a = rng.int(11, 19)
      b = 20 - a
    } else if (kind === 1) {
      b = rng.int(11, 17)
      a = rng.int(1, 20 - b)
    } else {
      a = rng.int(6, 9)
      b = rng.int(11 - a, 9)
    }
  }
  const it = pickItem(rng)
  return {
    ...equation(a, '+', b),
    instruction: I.solve,
    icon: 'pencil',
    visual: d === 1 ? { kind: 'items', icon: it.icon, count: a + b, added: b, slots: 20 } : undefined,
    hint: d === 2 ? HINTS.makeTen : HINTS.countOn,
    hintVisual: { kind: 'items', icon: it.icon, count: a + b, added: b, slots: 20 },
  }
}

export const sub20: GeneratorFn = (d, rng) => {
  let a: number, b: number
  if (d === 1) {
    a = 10 + rng.int(2, 9)
    b = rng.int(1, a - 10)
  } else if (d === 2) {
    a = rng.int(11, 18)
    b = rng.int((a % 10) + 1, 9)
  } else {
    const kind = rng.int(0, 2)
    a = kind === 2 ? rng.int(13, 19) : 20
    b = kind === 0 ? rng.int(3, 9) : kind === 1 ? rng.int(11, 18) : rng.int(11, a - 1)
  }
  const it = pickItem(rng)
  return {
    ...equation(a, '-', b),
    instruction: I.solve,
    icon: 'pencil',
    visual: d === 1 ? { kind: 'items', icon: it.icon, count: a, crossed: b, slots: 20 } : undefined,
    hint: HINTS.countBack,
    hintVisual: { kind: 'items', icon: it.icon, count: a, crossed: b, slots: 20 },
  }
}

export const missing: GeneratorFn = (d, rng) => {
  const max = d === 1 ? 10 : 20
  const r = rng.int(d === 1 ? 4 : 11, max)
  const a = rng.int(1, r - 1)
  const b = r - a
  if (d === 3 && rng.next() < 0.6) {
    // 18 - __ = 12, as in the placement test
    const big = rng.int(12, 20)
    const take = rng.int(1, big - 1)
    return {
      ...equation(big, '-', take, rng.next() < 0.7 ? 'b' : 'a'),
      instruction: I.fillMissing,
      icon: 'puzzle',
      hint: HINTS.missingSub,
    }
  }
  return {
    ...equation(a, '+', b, rng.next() < 0.7 ? 'b' : 'a'),
    instruction: I.fillMissing,
    icon: 'puzzle',
    hint: HINTS.missingAdd,
    hintVisual: { kind: 'items', icon: '⭐', count: a, slots: r },
  }
}

export const decompose: GeneratorFn = (d, rng) => {
  if (d < 3) {
    const x = rng.int(11, 19)
    const ones = x - 10
    const tokens = d === 1 ? [n(x), op('='), n(10), op('+'), blank()] : [n(x), op('='), blank(), op('+'), n(ones)]
    return {
      tokens,
      answers: [d === 1 ? ones : 10],
      meta: { a: 10, b: ones, op: '+', result: x, unknown: d === 1 ? 'b' : 'a' },
      answerType: 'number',
      instruction: I.fillMissing,
      icon: 'puzzle',
      visual: { kind: 'blocks', hundreds: 0, tens: 1, ones },
      hint: HINTS.tensOnes,
    }
  }
  const b = rng.int(2, 9)
  return {
    tokens: [n(20), op('='), blank(), op('+'), n(b)],
    answers: [20 - b],
    meta: { a: 20 - b, b, op: '+', result: 20, unknown: 'a' },
    answerType: 'number',
    instruction: I.fillMissing,
    icon: 'puzzle',
    hint: HINTS.missingAdd,
  }
}

export const howManyMissing: GeneratorFn = (d, rng) => {
  const total = d === 1 ? 10 : 20
  const have = rng.int(d === 1 ? 3 : 11, total - 1)
  const it = rng.pick([ITEMS[0], ITEMS[1]])
  return {
    tokens: [n(have), op('+'), blank(), op('='), n(total)],
    answers: [total - have],
    meta: { a: have, b: total - have, op: '+', result: total, unknown: 'b' },
    answerType: 'number',
    instruction: I.missingTo(it.word, total),
    icon: 'count',
    visual: { kind: 'items', icon: it.icon, count: have, slots: total },
    hint: HINTS.missingAdd,
  }
}

export const chain: GeneratorFn = (d, rng) => {
  const step = rng.int(2, d === 1 ? 3 : 5)
  const sub = d === 3 && rng.next() < 0.5
  const start = sub ? rng.int(4 * step, 20) : rng.int(0, 20 - 3 * step)
  const values = [0, 1, 2, 3].map((i) => (sub ? start - i * step : start + i * step))
  const hole = d === 1 ? 3 : rng.int(1, 3)
  const shown: (number | null)[] = values.map((v, i) => (i === hole ? null : v))
  const prev = values[hole - 1]
  return {
    visual: { kind: 'chain', values: shown, op: sub ? '-' : '+', step },
    answers: [values[hole]],
    meta: { a: prev, b: step, op: sub ? '-' : '+', result: values[hole], unknown: 'result' },
    answerType: 'number',
    instruction: sub ? I.chainSub(step) : I.chainAdd(step),
    icon: 'puzzle',
    hint: HINTS.sequence,
  }
}

export const writeExercise: GeneratorFn = (d, rng) => {
  const sub = d === 3
  const t = sub ? rng.int(2, 9) : rng.int(d === 1 ? 5 : 11, d === 1 ? 10 : 20)
  return {
    tokens: [blank(0), op(sub ? '-' : '+'), blank(1), op('='), n(t)],
    answers: sub ? [t + 5, 5] : [t - 1, 1],
    validate: ([a, b]) =>
      Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a <= 20 && (sub ? a - b === t : a + b === t),
    answerType: 'number',
    instruction: I.writeExercise(t),
    icon: 'pencil',
    hint: HINTS.writeExercise,
  }
}
