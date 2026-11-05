import { HINTS, I, W } from '../../content/he/instructions'
import { blank, n, op } from '../helpers'
import type { Choice, GeneratorFn, Token } from '../types'

export const numberLine: GeneratorFn = (d, rng) => {
  const cfg =
    d === 1
      ? { min: 0, max: 10, step: 1, labelEvery: 5 }
      : d === 2
        ? { min: 0, max: 20, step: 1, labelEvery: 5 }
        : { min: 0, max: 100, step: 10, labelEvery: 50 }
  let at: number
  do at = cfg.min + rng.int(1, (cfg.max - cfg.min) / cfg.step - 1) * cfg.step
  while (at % cfg.labelEvery === 0)
  return {
    tokens: [blank()],
    answers: [at],
    answerType: 'number',
    instruction: I.arrow,
    icon: 'eye',
    visual: { kind: 'numberline', ...cfg, arrowAt: at },
    hint: HINTS.numberLine,
  }
}

export const jumps: GeneratorFn = (d, rng) => {
  const step = d === 1 ? 2 : d === 2 ? 5 : 10
  const max = step * 10
  const k = rng.int(3, 8)
  const vals = [k - 3, k - 2, k - 1, k].map((i) => i * step)
  const tokens: Token[] = []
  vals.forEach((v, i) => {
    if (i) tokens.push(op(','))
    tokens.push(i === 3 ? blank() : n(v))
  })
  return {
    tokens,
    answers: [vals[3]],
    meta: { a: vals[2], b: step, op: '+', result: vals[3] },
    answerType: 'number',
    instruction: I.fillSequence,
    icon: 'puzzle',
    visual: { kind: 'numberline', min: 0, max, step, labelEvery: step * 5, jumps: vals.slice(0, 3) },
    hint: HINTS.sequence,
  }
}

const FRACTION_CHOICES: Choice[] = [
  { label: W.half, value: 2 },
  { label: W.quarter, value: 4 },
  { label: W.whole, value: 1 },
]

export const fractionShape: GeneratorFn = (d, rng) => {
  const shape = rng.pick(['circle', 'rect'] as const)
  if (d === 1 || (d === 3 && rng.next() < 0.5)) {
    const parts = rng.pick([1, 2, 4])
    return {
      answers: [parts],
      choices: FRACTION_CHOICES,
      answerType: 'choice',
      instruction: I.whichPartShaded,
      icon: 'eye',
      visual: { kind: 'fraction', shape, parts, shaded: 1 },
      hint: HINTS.fraction,
    }
  }
  const target = rng.pick([2, 4])
  const opts: Choice[] = rng.shuffle([
    { label: '', value: 2, visual: { kind: 'fraction', shape, parts: 2, shaded: 1 } },
    { label: '', value: 4, visual: { kind: 'fraction', shape, parts: 4, shaded: 1 } },
    { label: '', value: 3, visual: { kind: 'fraction', shape, parts: 4, shaded: 3 } },
  ])
  return {
    answers: [target],
    choices: opts,
    answerType: 'choice',
    instruction: I.whichShapeHas(target === 2 ? W.half : W.quarter),
    icon: 'choose',
    hint: HINTS.fraction,
  }
}

export const fractionQty: GeneratorFn = (d, rng) => {
  const kind = d === 1 ? 0 : d === 2 ? rng.int(0, 1) : rng.int(0, 2)
  if (kind === 0) {
    const x = rng.int(1, d === 1 ? 5 : 10) * 2
    return {
      tokens: [blank()],
      answers: [x / 2],
      meta: { a: x, b: 2, op: ':', result: x / 2 },
      answerType: 'number',
      instruction: I.halfOf(x),
      icon: 'count',
      visual: { kind: 'items', icon: '🍪', count: x, pairs: true },
      hint: HINTS.fractionQty,
      hintVisual: { kind: 'groups', groups: 2, each: x / 2, icon: '🍪' },
    }
  }
  if (kind === 1) {
    const x = rng.int(1, 5) * 4
    return {
      tokens: [blank()],
      answers: [x / 4],
      meta: { a: x, b: 4, op: ':', result: x / 4 },
      answerType: 'number',
      instruction: I.quarterOf(x),
      icon: 'count',
      visual: { kind: 'items', icon: '🍪', count: x },
      hint: HINTS.fractionQty,
      hintVisual: { kind: 'groups', groups: 4, each: x / 4, icon: '🍪' },
    }
  }
  const q = rng.pick([
    { i: I.quartersInWhole, a: 4, v: { kind: 'fraction' as const, shape: 'circle' as const, parts: 4, shaded: 4 } },
    { i: I.halvesInWhole, a: 2, v: { kind: 'fraction' as const, shape: 'circle' as const, parts: 2, shaded: 2 } },
    { i: I.quartersInHalf, a: 2, v: { kind: 'fraction' as const, shape: 'rect' as const, parts: 4, shaded: 2 } },
  ])
  return { tokens: [blank()], answers: [q.a], answerType: 'number', instruction: q.i, icon: 'eye', hint: HINTS.fraction, hintVisual: q.v }
}
