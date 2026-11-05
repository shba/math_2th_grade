import { HINTS } from '../../content/he/instructions'
import { blank } from '../helpers'
import type { GeneratorFn } from '../types'

const SETS = [
  {
    title: 'הַחַיָּה הָאֲהוּבָה בַּכִּתָּה',
    which: 'בְּאֵיזוֹ חַיָּה',
    cats: [
      { icon: '🐱', label: 'חָתוּל', b: 'בְּחָתוּל' },
      { icon: '🐶', label: 'כֶּלֶב', b: 'בְּכֶלֶב' },
      { icon: '🐰', label: 'אַרְנָב', b: 'בְּאַרְנָב' },
      { icon: '🐟', label: 'דָּג', b: 'בְּדָג' },
    ],
  },
  {
    title: 'הַפְּרִי הָאָהוּב בַּכִּתָּה',
    which: 'בְּאֵיזֶה פְּרִי',
    cats: [
      { icon: '🍎', label: 'תַּפּוּחַ', b: 'בְּתַפּוּחַ' },
      { icon: '🍌', label: 'בָּנָנָה', b: 'בְּבָנָנָה' },
      { icon: '🍇', label: 'עֲנָבִים', b: 'בַּעֲנָבִים' },
      { icon: '🍓', label: 'תּוּת', b: 'בְּתוּת' },
    ],
  },
]

export const bars: GeneratorFn = (d, rng) => {
  const set = rng.pick(SETS)
  const values: number[] = []
  while (values.length < 4) {
    const v = rng.int(1, 9)
    if (!values.includes(v)) values.push(v)
  }
  const visual = { kind: 'bars' as const, labels: set.cats.map((c) => c.label), icons: set.cats.map((c) => c.icon), values }
  const base = { visual, icon: 'eye' as const, hint: HINTS.bars, story: set.title }
  if (d === 1) {
    const i = rng.int(0, 3)
    return { ...base, tokens: [blank()], answers: [values[i]], answerType: 'number', instruction: `כַּמָּה יְלָדִים בָּחֲרוּ ${set.cats[i].b}?` }
  }
  if (d === 2) {
    const most = rng.next() < 0.5
    const target = values.indexOf(most ? Math.max(...values) : Math.min(...values))
    return {
      ...base,
      answers: [target],
      choices: set.cats.map((c, i) => ({ label: `${c.icon} ${c.label}`, value: i })),
      answerType: 'choice',
      instruction: `${set.which} בָּחֲרוּ ${most ? 'הֲכִי הַרְבֵּה' : 'הֲכִי מְעַט'} יְלָדִים?`,
    }
  }
  if (rng.next() < 0.5) {
    const [i, j] = rng.shuffle([0, 1, 2, 3])
    const [hi, lo] = values[i] > values[j] ? [i, j] : [j, i]
    return {
      ...base,
      tokens: [blank()],
      answers: [values[hi] - values[lo]],
      meta: { a: values[hi], b: values[lo], op: '-', result: values[hi] - values[lo] },
      answerType: 'number',
      instruction: `כַּמָּה יְלָדִים יוֹתֵר בָּחֲרוּ ${set.cats[hi].b} מֵאֲשֶׁר ${set.cats[lo].b}?`,
    }
  }
  const total = values.reduce((s, v) => s + v, 0)
  return { ...base, tokens: [blank()], answers: [total], answerType: 'number', instruction: 'כַּמָּה יְלָדִים בָּחֲרוּ בְּסַךְ הַכֹּל?' }
}
