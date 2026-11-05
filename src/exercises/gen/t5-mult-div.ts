import { HINTS, I } from '../../content/he/instructions'
import { blank, equation, n, op } from '../helpers'
import type { GeneratorFn, Token } from '../types'
import { SHOP } from './t4-word-problems'

const ICONS = ['🍓', '🧁', '🌼', '🐞', '🍬']

export const groups: GeneratorFn = (d, rng) => {
  const g = rng.int(2, d === 1 ? 3 : 5)
  const each = rng.int(2, d === 1 ? 4 : 5)
  return {
    ...equation(g, '×', each),
    instruction: I.howManyTotal,
    icon: 'count',
    visual: { kind: 'groups', groups: g, each, icon: rng.pick(ICONS) },
    hint: HINTS.groups,
  }
}

export const repeatedAdd: GeneratorFn = (d, rng) => {
  const times = rng.int(2, d === 1 ? 3 : 5)
  const x = rng.int(2, d === 3 ? 10 : 5)
  const tokens: Token[] = []
  for (let i = 0; i < times; i++) {
    if (i) tokens.push(op('+'))
    tokens.push(n(x))
  }
  const askTimes = d >= 2 && rng.next() < 0.5
  tokens.push(op('='), askTimes ? blank() : n(times), op('×'), askTimes ? n(x) : blank())
  return {
    tokens,
    answers: [askTimes ? times : x],
    answerType: 'number',
    instruction: I.fillMissing,
    icon: 'puzzle',
    visual: { kind: 'groups', groups: times, each: x, icon: rng.pick(ICONS) },
    hint: HINTS.table,
  }
}

function tableExercise(maxFactor: number): GeneratorFn {
  return (d, rng) => {
    const easy = [1, 2, 5, 10].filter((f) => f <= Math.max(maxFactor, 5))
    const a = d === 1 ? rng.pick(easy) : rng.int(2, maxFactor)
    const b = rng.int(d === 1 ? 1 : 2, maxFactor)
    const [x, y] = rng.next() < 0.5 ? [a, b] : [b, a]
    const missingFactor = d === 3 && rng.next() < 0.5
    return {
      ...equation(x, '×', y, missingFactor ? 'a' : 'result'),
      instruction: missingFactor ? I.fillMissing : I.solve,
      icon: 'pencil',
      hint: HINTS.table,
      hintVisual: x * y <= 36 ? { kind: 'groups', groups: x, each: y, icon: '⭐' } : undefined,
    }
  }
}

export const table6 = tableExercise(6)
export const table10 = tableExercise(10)

export const legs: GeneratorFn = (d, rng) => {
  const things = [
    { per: 4, story: 'לְכִסֵּא יֵשׁ 4 רַגְלַיִם.', q: (k: number) => `כַּמָּה רַגְלַיִם יֵשׁ לְ־${k} כִּסְאוֹת?`, icon: '🪑' },
    { per: 3, story: 'לִתְלַת־אוֹפַן יֵשׁ 3 גַּלְגַּלִּים.', q: (k: number) => `כַּמָּה גַּלְגַּלִּים יֵשׁ לְ־${k} תְּלַת־אוֹפַנִּים?`, icon: '🚲' },
    { per: 5, story: 'בְּכׇל יָד יֵשׁ 5 אֶצְבָּעוֹת.', q: (k: number) => `כַּמָּה אֶצְבָּעוֹת יֵשׁ בְּ־${k} יָדַיִם?`, icon: '🖐️' },
    { per: 2, story: 'לְכׇל בַּרְוָז יֵשׁ 2 רַגְלַיִם.', q: (k: number) => `כַּמָּה רַגְלַיִם יֵשׁ לְ־${k} בַּרְוָזִים?`, icon: '🦆' },
  ]
  const t = rng.pick(things)
  const k = rng.int(2, d === 1 ? 4 : d === 2 ? 6 : 9)
  return {
    ...equation(k, '×', t.per),
    tokens: undefined,
    answerType: 'number',
    icon: 'story',
    story: t.story,
    instruction: t.q(k),
    visual: d === 1 ? { kind: 'groups', groups: k, each: t.per, icon: '•' } : undefined,
    hint: HINTS.groups,
  }
}

export const division: GeneratorFn = (d, rng) => {
  const k = rng.int(2, d === 1 ? 3 : 6)
  const each = rng.int(2, d === 1 ? 5 : 6)
  const total = k * each
  const kind = d === 1 ? rng.int(0, 1) : rng.int(0, 2)
  if (kind === 0) {
    return {
      ...equation(total, ':', k),
      tokens: undefined,
      icon: 'story',
      story: `יֵשׁ ${total} סֻכָּרִיּוֹת. מְחַלְּקִים אוֹתָן שָׁוֶה בְּשָׁוֶה לְ־${k} יְלָדִים.`,
      instruction: 'כַּמָּה סֻכָּרִיּוֹת יְקַבֵּל כׇּל יֶלֶד?',
      visual: { kind: 'items', icon: '🍬', count: total },
      hint: HINTS.division,
      hintVisual: { kind: 'groups', groups: k, each, icon: '🍬' },
    }
  }
  if (kind === 1) {
    return {
      ...equation(total, ':', each),
      tokens: undefined,
      icon: 'story',
      story: `${total} יְלָדִים מִתְחַלְּקִים לִקְבוּצוֹת. בְּכׇל קְבוּצָה ${each} יְלָדִים.`,
      instruction: 'כַּמָּה קְבוּצוֹת יִהְיוּ?',
      hint: HINTS.division,
      hintVisual: { kind: 'groups', groups: k, each, icon: '🙂' },
    }
  }
  return { ...equation(total, ':', k), instruction: I.solve, icon: 'pencil', hint: HINTS.division }
}

export const money: GeneratorFn = (d, rng) => {
  if (d === 1 || rng.next() < 0.4) {
    const p = rng.int(2, d === 1 ? 5 : 10)
    const k = rng.int(2, d === 1 ? 4 : 6)
    return {
      ...equation(k, '×', p),
      tokens: undefined,
      icon: 'story',
      story: `כַּרְטִיס לַהַצָּגָה עוֹלֶה ${p} שְׁקָלִים.`,
      instruction: `כַּמָּה עוֹלִים ${k} כַּרְטִיסִים?`,
      hint: HINTS.groups,
    }
  }
  const item = rng.pick(SHOP)
  const paid = item.price < 10 ? 10 : 20
  const total = item.price
  return {
    ...equation(paid, '-', total),
    tokens: undefined,
    icon: 'story',
    visual: { kind: 'prices', items: [item] },
    story: `אָרִי קָנָה ${item.name}. הוּא נָתַן ${paid} שְׁקָלִים.`,
    instruction: 'כַּמָּה עֹדֶף הוּא קִבֵּל?',
    hint: HINTS.change,
  }
}
