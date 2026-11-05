import { HINTS, I } from '../../content/he/instructions'
import { blank, numberChoices } from '../helpers'
import type { Choice, GeneratorFn } from '../types'

export const ruler: GeneratorFn = (d, rng) => {
  if (d === 3 && rng.next() < 0.4) {
    return { tokens: [blank()], answers: [100], answerType: 'number', instruction: I.cmInMeter, icon: 'ruler', hint: 'מֶטֶר אֶחָד הוּא 100 סֶנְטִימֶטְרִים.' }
  }
  const length = rng.int(2, d === 1 ? 8 : 14)
  return {
    tokens: [blank()],
    answers: [length],
    answerType: 'number',
    instruction: I.rulerLength,
    icon: 'ruler',
    visual: { kind: 'ruler', length, icon: rng.pick(['✏️', '🖍️', '🐛']) },
    hint: HINTS.ruler,
  }
}

export const area: GeneratorFn = (d, rng) => {
  const w = rng.int(2, d === 1 ? 3 : 5)
  const h = rng.int(1, d === 1 ? 3 : 4)
  const perim = d === 3 || (d === 2 && rng.next() < 0.5)
  return {
    tokens: [blank()],
    answers: [perim ? 2 * (w + h) : w * h],
    answerType: 'number',
    instruction: perim ? I.perimeter : I.area,
    icon: 'count',
    visual: { kind: 'grid', w, h },
    hint: perim ? HINTS.perimeter : HINTS.area,
  }
}

const PAIRS = [
  ['🐘', '🐭'],
  ['🍉', '🍒'],
  ['🧱', '🪶'],
  ['🚗', '🚲'],
  ['🎃', '🍓'],
] as const

export const weight: GeneratorFn = (_d, rng) => {
  const [heavy, light] = rng.pick(PAIRS)
  const heavyLeft = rng.next() < 0.5
  const left = heavyLeft ? heavy : light
  const right = heavyLeft ? light : heavy
  return {
    answers: [heavyLeft ? 0 : 1],
    choices: [
      { label: left, value: 0 },
      { label: right, value: 1 },
    ],
    answerType: 'choice',
    instruction: I.heavier,
    icon: 'eye',
    visual: { kind: 'balance', left, right, heavier: heavyLeft ? 'left' : 'right' },
    hint: HINTS.weight,
  }
}

const HOURS = ['', 'אַחַת', 'שְׁתַּיִם', 'שָׁלוֹשׁ', 'אַרְבַּע', 'חָמֵשׁ', 'שֵׁשׁ', 'שֶׁבַע', 'שְׁמוֹנֶה', 'תֵּשַׁע', 'עֶשֶׂר', 'אַחַת־עֶשְׂרֵה', 'שְׁתֵּים־עֶשְׂרֵה']
const TO_HOURS = ['', 'לְאַחַת', 'לִשְׁתַּיִם', 'לְשָׁלוֹשׁ', 'לְאַרְבַּע', 'לְחָמֵשׁ', 'לְשֵׁשׁ', 'לְשֶׁבַע', 'לִשְׁמוֹנֶה', 'לְתֵשַׁע', 'לְעֶשֶׂר', 'לְאַחַת־עֶשְׂרֵה', 'לִשְׁתֵּים־עֶשְׂרֵה']

export function timeWords(h: number, m: number): string {
  if (m === 0) return HOURS[h]
  if (m === 30) return `${HOURS[h]} וָחֵצִי`
  if (m === 15) return `${HOURS[h]} וָרֶבַע`
  return `רֶבַע ${TO_HOURS[(h % 12) + 1]}`
}

const timeValue = (h: number, m: number) => h * 60 + m
const digital = (v: number) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`

export const clock: GeneratorFn = (d, rng) => {
  const minuteOpts = d === 1 ? [0] : d === 2 ? [0, 30] : [0, 15, 30, 45]
  const h = rng.int(1, 12)
  const m = rng.pick(minuteOpts)
  const correct = timeValue(h, m)
  const opts = new Set([correct])
  const tryAdd = (hh: number, mm: number) => opts.size < 4 && opts.add(timeValue(((hh + 11) % 12) + 1, mm))
  // Typical confusions: the neighbouring hour and the other half hour.
  tryAdd(h + 1, m)
  tryAdd(h - 1, m)
  if (d > 1) tryAdd(h, (m + 30) % 60)
  while (opts.size < 4) tryAdd(rng.int(1, 12), rng.pick(minuteOpts))
  const choices: Choice[] = rng.shuffle([...opts]).map((v) => {
    const hh = Math.floor(v / 60)
    const mm = v % 60
    return { label: timeWords(hh, mm), value: v, speak: timeWords(hh, mm) }
  })
  return {
    answers: [correct],
    choices,
    answerType: 'choice',
    instruction: I.whatTime,
    icon: 'clock',
    visual: { kind: 'clock', h, m },
    hint: HINTS.clock,
  }
}

export const duration: GeneratorFn = (d, rng) => {
  if (d === 1) {
    const half = rng.next() < 0.5
    return { tokens: [blank()], answers: [half ? 30 : 60], answerType: 'number', instruction: half ? I.minutesInHalfHour : I.minutesInHour, icon: 'clock', hint: HINTS.clock }
  }
  const start = timeValue(rng.int(1, 9), rng.pick([0, 30]))
  const durs = [
    { m: 60, w: 'שָׁעָה' },
    { m: 30, w: 'חֲצִי שָׁעָה' },
    { m: 90, w: 'שָׁעָה וָחֵצִי' },
    { m: 120, w: 'שְׁעָתַיִם' },
  ]
  const dur = rng.pick(d === 2 ? durs.slice(0, 2) : durs)
  const end = start + dur.m
  const choices = numberChoices(end, rng, [end + 30, end - 30, start + 60]).map((c) => ({ ...c, label: digital(c.value) }))
  return {
    answers: [end],
    choices,
    answerType: 'choice',
    story: `הַמִּשְׂחָק הִתְחִיל בַּשָּׁעָה ${digital(start)}, וְנִמְשַׁךְ ${dur.w}.`,
    instruction: 'מָתַי הַמִּשְׂחָק נִגְמַר?',
    icon: 'clock',
    visual: { kind: 'clock', h: Math.floor(start / 60), m: start % 60 },
    hint: HINTS.clock,
  }
}
