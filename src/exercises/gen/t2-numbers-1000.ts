import { HINTS, I, W } from '../../content/he/instructions'
import { blank, digits, n, op } from '../helpers'
import type { GeneratorFn, Token } from '../types'

export const placeValue: GeneratorFn = (d, rng) => {
  const x = d === 1 ? rng.int(11, 49) : d === 2 ? rng.int(10, 99) : rng.int(40, 99)
  const { t, o } = digits(x)
  return {
    tokens: [blank()],
    answers: [x],
    answerType: 'number',
    instruction: I.writeNumberInPicture,
    icon: 'count',
    visual: { kind: 'blocks', hundreds: 0, tens: t, ones: o },
    hint: HINTS.tensOnes,
  }
}

export const placeValue3: GeneratorFn = (d, rng) => {
  const x = d === 1 ? rng.int(1, 3) * 100 + rng.int(1, 4) * 10 + rng.int(0, 5) : rng.int(100, d === 2 ? 599 : 999)
  const { h, t, o } = digits(x)
  return {
    tokens: [blank()],
    answers: [x],
    answerType: 'number',
    instruction: I.writeNumberInPicture,
    icon: 'count',
    visual: { kind: 'blocks', hundreds: h, tens: t, ones: o },
    hint: HINTS.hundreds,
  }
}

export const tensOnes: GeneratorFn = (d, rng) => {
  const x = rng.int(11, 99)
  const { t, o } = digits(x)
  if (d === 3) {
    return {
      tokens: [n(x), op('='), blank(), op('+'), n(o)],
      answers: [t * 10],
      answerType: 'number',
      instruction: I.fillMissing,
      icon: 'puzzle',
      hint: HINTS.tensOnes,
      hintVisual: { kind: 'blocks', hundreds: 0, tens: t, ones: o },
    }
  }
  const askTens = d === 1 || rng.next() < 0.5
  return {
    tokens: [blank()],
    answers: [askTens ? t : o],
    answerType: 'number',
    instruction: askTens ? I.howManyTens(x) : I.howManyOnes(x),
    icon: 'eye',
    hint: HINTS.tensOnes,
    hintVisual: { kind: 'blocks', hundreds: 0, tens: t, ones: o },
  }
}

export const neighbors: GeneratorFn = (d, rng) => {
  if (d === 1) {
    const x = rng.int(10, 98)
    return { tokens: [n(x), op(','), blank()], answers: [x + 1], meta: { a: x, b: 1, op: '+', result: x + 1 }, answerType: 'number', instruction: I.after(x), icon: 'eye', hint: HINTS.sequence }
  }
  if (d === 2) {
    const x = rng.next() < 0.5 ? rng.int(2, 9) * 10 : rng.int(11, 99)
    return { tokens: [blank(), op(','), n(x)], answers: [x - 1], meta: { a: x, b: 1, op: '-', result: x - 1 }, answerType: 'number', instruction: I.before(x), icon: 'eye', hint: HINTS.sequence }
  }
  const x = rng.int(10, 97)
  return { tokens: [n(x), op(','), blank(), op(','), n(x + 2)], answers: [x + 1], answerType: 'number', instruction: I.between(x, x + 2), icon: 'eye', hint: HINTS.sequence }
}

export const sequence: GeneratorFn = (d, rng) => {
  const step = d === 1 ? rng.pick([1, 10]) : d === 2 ? rng.pick([2, 5, 10]) : rng.pick([-10, -5, 100, -2])
  const start = step === 100 ? rng.int(1, 5) * 100 + rng.int(0, 99) : step < 0 ? rng.int(40, 99) : rng.int(1, 60)
  const vals = [0, 1, 2, 3].map((i) => start + i * step)
  const hole = d === 1 ? 3 : rng.int(1, 3)
  const tokens: Token[] = []
  vals.forEach((v, i) => {
    if (i) tokens.push(op(','))
    tokens.push(i === hole ? blank() : n(v))
  })
  tokens.push(op(','), op('…'))
  return {
    tokens,
    answers: [vals[hole]],
    meta: { a: vals[hole - 1], b: Math.abs(step), op: step > 0 ? '+' : '-', result: vals[hole] },
    answerType: 'number',
    instruction: I.fillSequence,
    icon: 'puzzle',
    hint: HINTS.sequence,
  }
}

const SIGN_CHOICES = [
  { label: '<', value: 0, speak: 'קָטָן מִ' },
  { label: '=', value: 1, speak: 'שָׁוֶה' },
  { label: '>', value: 2, speak: 'גָּדוֹל מִ' },
]

export const compare: GeneratorFn = (d, rng) => {
  const max = d === 3 ? 999 : 99
  let a = rng.int(10, max)
  let b = rng.next() < 0.15 ? a : rng.int(10, max)
  if (d >= 2 && rng.next() < 0.5) b = Number(String(a).split('').reverse().join('')) || a + 1
  if (d === 1 && Math.abs(a - b) < 3) b = a + 5
  ;[a, b] = rng.next() < 0.5 ? [a, b] : [b, a]
  const ans = a < b ? 0 : a === b ? 1 : 2
  return {
    tokens: [n(a), blank(), n(b)],
    answers: [ans],
    choices: SIGN_CHOICES,
    answerType: 'choice',
    instruction: I.chooseSign,
    icon: 'choose',
    hint: HINTS.compare,
  }
}

export const evenOdd: GeneratorFn = (d, rng) => {
  const x = d === 1 ? rng.int(2, 12) : d === 2 ? rng.int(11, 40) : rng.int(41, 999)
  return {
    tokens: [n(x)],
    answers: [x % 2],
    choices: [
      { label: W.even, value: 0 },
      { label: W.odd, value: 1 },
    ],
    answerType: 'choice',
    instruction: I.evenOdd(x),
    icon: 'choose',
    visual: d === 1 ? { kind: 'items', icon: '🧦', count: x, pairs: true } : undefined,
    hint: HINTS.evenOdd,
    hintVisual: x <= 20 ? { kind: 'items', icon: '🧦', count: x, pairs: true } : undefined,
  }
}

export const hundreds: GeneratorFn = (d, rng) => {
  const x = rng.int(101, 999)
  const { h, t, o } = digits(x)
  if (d === 1) {
    return {
      tokens: [blank()],
      answers: [h],
      answerType: 'number',
      instruction: I.howManyHundreds(x),
      icon: 'eye',
      hint: HINTS.hundreds,
      hintVisual: { kind: 'blocks', hundreds: h, tens: t, ones: o },
    }
  }
  if (d === 2) {
    const which = rng.int(0, 2)
    const parts = [h * 100, t * 10, o]
    const tokens: Token[] = [n(x), op('=')]
    parts.forEach((p, i) => {
      if (i) tokens.push(op('+'))
      tokens.push(i === which ? blank() : n(p))
    })
    return { tokens, answers: [parts[which]], answerType: 'number', instruction: I.fillMissing, icon: 'puzzle', hint: HINTS.hundreds }
  }
  return {
    tokens: [blank(), op('='), n(h * 100), op('+'), n(t * 10), op('+'), n(o)],
    answers: [x],
    answerType: 'number',
    instruction: I.fillMissing,
    icon: 'puzzle',
    hint: HINTS.hundreds,
  }
}

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
const TENS = ['', 'י', 'כ', 'ל']

export function toHebrewLetters(x: number): string {
  if (x === 15) return 'ט״ו'
  if (x === 16) return 'ט״ז'
  const s = TENS[Math.floor(x / 10)] + ONES[x % 10]
  return s.length === 1 ? `${s}׳` : `${s.slice(0, -1)}״${s.slice(-1)}`
}

export const gimatria: GeneratorFn = (d, rng) => {
  const x = d === 1 ? rng.int(1, 10) : d === 2 ? rng.int(11, 20) : rng.int(21, 39)
  if (d === 3 && rng.next() < 0.5) {
    const opts = new Set([x])
    while (opts.size < 3) opts.add(rng.int(11, 39))
    return {
      tokens: [n(x)],
      answers: [x],
      choices: rng.shuffle([...opts]).map((v) => ({ label: toHebrewLetters(v), value: v })),
      answerType: 'choice',
      instruction: I.numberToLetters(x),
      icon: 'choose',
      hint: HINTS.letters,
    }
  }
  return {
    tokens: [{ t: 'w', v: toHebrewLetters(x) }, op('='), blank()],
    answers: [x],
    answerType: 'number',
    instruction: I.lettersToNumber,
    icon: 'eye',
    hint: HINTS.letters,
  }
}
