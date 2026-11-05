import type { Choice, ExerciseMeta, Op, Rng, Token } from './types'

export const n = (v: number): Token => ({ t: 'n', v })
export const op = (v: Extract<Token, { t: 'op' }>['v']): Token => ({ t: 'op', v })
export const blank = (i = 0): Token => ({ t: 'blank', i })

export function compute(a: number, o: Op, b: number): number {
  switch (o) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '×':
      return a * b
    case ':':
      return a / b
  }
}

export function equation(a: number, o: Op, b: number, unknown: 'result' | 'a' | 'b' = 'result') {
  const r = compute(a, o, b)
  const tokens: Token[] =
    unknown === 'a'
      ? [blank(), op(o), n(b), op('='), n(r)]
      : unknown === 'b'
        ? [n(a), op(o), blank(), op('='), n(r)]
        : [n(a), op(o), n(b), op('='), blank()]
  const answer = unknown === 'a' ? a : unknown === 'b' ? b : r
  const meta: ExerciseMeta = { a, b, op: o, result: r, unknown }
  return { tokens, answers: [answer], meta, answerType: 'number' as const }
}

export const reverseDigits = (x: number) => Number(String(x).split('').reverse().join(''))

/** Four numeric choices: the answer plus plausible mistakes (off by one, reversed digits, ±10). */
export function numberChoices(answer: number, rng: Rng, extra: number[] = []): Choice[] {
  const pool = [...extra, answer + 1, answer - 1, answer + 10, answer - 10, reverseDigits(answer), answer + 2, answer - 2]
  const set = new Set<number>([answer])
  for (const v of rng.shuffle(pool)) {
    if (set.size >= 4) break
    if (v >= 0 && Number.isInteger(v)) set.add(v)
  }
  let k = 3
  while (set.size < 4) set.add(answer + k++)
  return rng.shuffle([...set]).map((v) => ({ label: String(v), value: v }))
}

export const digits = (x: number) => ({ h: Math.floor(x / 100), t: Math.floor(x / 10) % 10, o: x % 10 })

export function needsRegroup(a: number, o: '+' | '-', b: number) {
  return o === '+' ? (a % 10) + (b % 10) >= 10 : a % 10 < b % 10
}
