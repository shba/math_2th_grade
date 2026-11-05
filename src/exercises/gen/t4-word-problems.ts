import { HINTS } from '../../content/he/instructions'
import { equation } from '../helpers'
import type { GeneratorFn, Rng } from '../types'

// Story characters have a fixed gender; only text addressed to the child is gendered.
const GIRLS = [
  { name: 'נוֹעָה', le: 'לְנוֹעָה' },
  { name: 'מָאיָה', le: 'לְמָאיָה' },
  { name: 'תָּמָר', le: 'לְתָמָר' },
  { name: 'שִׁירָה', le: 'לְשִׁירָה' },
]
const BOYS = [
  { name: 'דָּנִי', le: 'לְדָנִי' },
  { name: 'יוֹנָתָן', le: 'לְיוֹנָתָן' },
  { name: 'עוֹדֵד', le: 'לְעוֹדֵד' },
  { name: 'אָרִי', le: 'לְאָרִי' },
]

const maxFor = (d: number) => (d === 1 ? 20 : d === 2 ? 50 : 100)

function sumParts(rng: Rng, max: number) {
  const r = rng.int(Math.min(8, max - 2), max)
  const a = rng.int(1, r - 1)
  return { a, b: r - a, r }
}

export const oneStep: GeneratorFn = (d, rng) => {
  const max = maxFor(d)
  const { a, b, r } = sumParts(rng, max)
  const girl = rng.pick(GIRLS)
  const kind = rng.int(0, d === 1 ? 2 : 4)
  const base = { icon: 'story' as const, answerType: 'number' as const, hint: HINTS.story }
  switch (kind) {
    case 0:
      return {
        ...base,
        ...equation(a, '+', b),
        tokens: undefined,
        story: `עַל עֵץ יָשְׁבוּ ${a} צִפּוֹרִים. הִגִּיעוּ עוֹד ${b} צִפּוֹרִים.`,
        instruction: 'כַּמָּה צִפּוֹרִים יֵשׁ עַל הָעֵץ עַכְשָׁו?',
        visual: r <= 20 ? { kind: 'items', icon: '🐦', count: r, added: b } : undefined,
      }
    case 1:
      return {
        ...base,
        ...equation(r, '-', b),
        tokens: undefined,
        story: `עַל עֵץ יָשְׁבוּ ${r} צִפּוֹרִים. ${b} צִפּוֹרִים עָפוּ.`,
        instruction: 'כַּמָּה צִפּוֹרִים נִשְׁאֲרוּ עַל הָעֵץ?',
        visual: r <= 20 ? { kind: 'items', icon: '🐦', count: r, crossed: b } : undefined,
      }
    case 2:
      return {
        ...base,
        ...equation(a, '+', b),
        tokens: undefined,
        story: `${girl.le} הָיוּ ${a} מַדְבֵּקוֹת. הִיא קִבְּלָה עוֹד ${b} מַדְבֵּקוֹת.`,
        instruction: 'כַּמָּה מַדְבֵּקוֹת יֵשׁ לָהּ עַכְשָׁו?',
      }
    case 3:
      // Asks about a part, so it is solved by subtraction even though the story says "more".
      return {
        ...base,
        ...equation(a, '+', b, 'a'),
        tokens: undefined,
        story: `בַּסַּל הָיוּ תַּפּוּחִים. אִמָּא שָׂמָה בַּסַּל עוֹד ${b} תַּפּוּחִים, וְעַכְשָׁו יֵשׁ בּוֹ ${r} תַּפּוּחִים.`,
        instruction: 'כַּמָּה תַּפּוּחִים הָיוּ בַּסַּל בַּהַתְחָלָה?',
      }
    default:
      return {
        ...base,
        ...equation(a, '+', b, 'b'),
        tokens: undefined,
        story: `סְכוּם שֶׁל שְׁנֵי מִסְפָּרִים הוּא ${r}. מִסְפָּר אֶחָד הוּא ${a}.`,
        instruction: 'מָה הַמִּסְפָּר הַשֵּׁנִי?',
      }
  }
}

export const compareStory: GeneratorFn = (d, rng) => {
  const max = maxFor(d)
  const girl = rng.pick(GIRLS)
  const boy = rng.pick(BOYS)
  const a = rng.int(3, Math.floor(max / 2))
  const diff = rng.int(1, Math.min(9, max - a))
  const kind = rng.int(0, 2)
  const base = { icon: 'story' as const, answerType: 'number' as const, hint: HINTS.compareStory }
  if (kind === 0) {
    return {
      ...base,
      ...equation(a, '+', diff),
      tokens: undefined,
      story: `${girl.le} יֵשׁ ${a} שְׁקָלִים. ${boy.le} יֵשׁ ${diff} שְׁקָלִים יוֹתֵר.`,
      instruction: `כַּמָּה שְׁקָלִים יֵשׁ ${boy.le}?`,
    }
  }
  if (kind === 1) {
    const big = a + diff
    return {
      ...base,
      ...equation(big, '-', diff),
      tokens: undefined,
      story: `${girl.le} יֵשׁ ${big} שְׁקָלִים. ${boy.le} יֵשׁ ${diff} שְׁקָלִים פָּחוֹת.`,
      instruction: `כַּמָּה שְׁקָלִים יֵשׁ ${boy.le}?`,
    }
  }
  const big = a + diff
  return {
    ...base,
    ...equation(big, '-', a),
    tokens: undefined,
    story: `עַל מַדָּף אֶחָד יֵשׁ ${a} סְפָרִים. עַל הַמַּדָּף הַשֵּׁנִי יֵשׁ ${big} סְפָרִים.`,
    instruction: 'כַּמָּה סְפָרִים יֵשׁ יוֹתֵר עַל הַמַּדָּף הַשֵּׁנִי?',
  }
}

export const twoStep: GeneratorFn = (d, rng) => {
  const boy = rng.pick(BOYS)
  if (rng.next() < 0.5) {
    const a = rng.int(5, d === 1 ? 10 : 30)
    const b = rng.int(5, d === 1 ? 10 : 30)
    const c = rng.int(2, Math.min(a + b - 1, 20))
    return {
      answers: [a + b - c],
      meta: { a: a + b, b: c, op: '-', result: a + b - c },
      answerType: 'number',
      icon: 'story',
      story: `${boy.le} הָיוּ ${a} שְׁקָלִים. הוּא קִבֵּל עוֹד ${b} שְׁקָלִים, וְקָנָה מַמְתָּקִים בְּ־${c} שְׁקָלִים.`,
      instruction: 'כַּמָּה שְׁקָלִים נִשְׁאֲרוּ לוֹ?',
      hint: HINTS.twoStep,
    }
  }
  const [a, b, c] = [rng.int(2, 9), rng.int(2, 9), rng.int(2, d === 1 ? 5 : 9)]
  return {
    answers: [a + b + c],
    meta: { a: a + b, b: c, op: '+', result: a + b + c },
    answerType: 'number',
    icon: 'story',
    story: `אִמָּא קָנְתָה ${a} תַּפּוּחִים, ${b} אַגָּסִים וְ־${c} בָּנָנוֹת.`,
    instruction: 'כַּמָּה פֵּרוֹת אִמָּא קָנְתָה?',
    hint: HINTS.twoStep,
    hintVisual: { kind: 'items', icon: '🍐', count: a + b + c },
  }
}

export const SHOP = [
  { icon: '🥁', name: 'תֹּף', price: 8 },
  { icon: '🤖', name: 'רוֹבּוֹט', price: 14 },
  { icon: '⚽', name: 'כַּדּוּר', price: 5 },
  { icon: '🧸', name: 'דֻּבִּי', price: 10 },
  { icon: '📕', name: 'סֵפֶר', price: 12 },
  { icon: '🪁', name: 'עֲפִיפוֹן', price: 7 },
]

/** The price table from the placement test: buy two items, how much in total? */
export const prices: GeneratorFn = (d, rng) => {
  const items = rng.shuffle(SHOP).slice(0, 3)
  const [x, y] = rng.shuffle(items).slice(0, 2)
  const girl = rng.pick(GIRLS)
  if (d === 3) {
    const total = x.price + y.price
    const paid = total <= 20 ? 20 : total <= 30 ? 30 : 50
    return {
      ...equation(paid, '-', total),
      tokens: undefined,
      answerType: 'number',
      icon: 'story',
      visual: { kind: 'prices', items },
      story: `${girl.name} קָנְתָה ${x.name} וְגַם ${y.name}. הִיא שִׁלְּמָה ${paid} שְׁקָלִים.`,
      instruction: 'כַּמָּה עֹדֶף הִיא קִבְּלָה?',
      hint: HINTS.change,
    }
  }
  return {
    ...equation(x.price, '+', y.price),
    tokens: undefined,
    answerType: 'number',
    icon: 'story',
    visual: { kind: 'prices', items },
    story: `${girl.name} קָנְתָה ${x.name} וְגַם ${y.name}.`,
    instruction: 'כַּמָּה הִיא שִׁלְּמָה?',
    hint: HINTS.story,
  }
}
