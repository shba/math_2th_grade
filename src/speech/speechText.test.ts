import { describe, expect, it } from 'vitest'
import { tx } from '../content/he/text'
import { analyzeAnswer } from '../engine/errorAnalysis'
import { SKILLS } from '../exercises/registry'
import { createRng } from '../exercises/rng'
import type { Difficulty, Exercise } from '../exercises/types'
import { LESSONS } from '../lessons/lessons'
import phraseList from '../../speech/phrases.json'
import { trimClip } from './clips'
import { choicesForSpeech, tokensForSpeech } from './phrasing'
import { attachPrefix, coverSentence, numberPhrases, toSentences } from './speechText'
import { chunkText } from './webSpeech'

const N = <T,>(x: T): T => JSON.parse(JSON.stringify(x).normalize('NFC'))
const say = (t: string) => toSentences(t).map((s) => s.map((w) => w.say).join(' ').normalize('NFC'))

describe('toSentences', () => {
  it('reads digits, signs and prefixed numbers', () => {
    expect(say('3 + 4 = 7')).toEqual(N(['שָׁלוֹשׁ וְעוֹד אַרְבַּע שָׁוֶה שֶׁבַע'.normalize('NFC')]))
    expect(say('קֹדֶם מַשְׁלִימִים לְ־10. 8 וְעוֹד 2 זֶה 10.')).toEqual(N(['קֹדֶם מַשְׁלִימִים לְעֶשֶׂר.', 'שְׁמוֹנֶה וְעוֹד שְׁתַּיִם זֶה עֶשֶׂר.']))
    expect(say('בֵּין 12 לְ־15?')).toEqual(N(['בֵּין שְׁתֵּים־עֶשְׂרֵה לַחֲמֵשׁ־עֶשְׂרֵה?']))
    expect(say('חֲצִי מִ־10, וְ־4 יְחִידוֹת')).toEqual(N(['חֲצִי מֵעֶשֶׂר, וְאַרְבַּע יְחִידוֹת']))
  })

  it('marks number words and comma breaths', () => {
    const [s] = toSentences('4, 8, 12 תּוּתִים')
    expect(s.map((w) => w.num)).toEqual(N([true, true, true, false]))
    expect(s.map((w) => w.pause)).toEqual(N([true, true, false, false]))
  })

  it('attaches prefixes with the right vowel', () => {
    expect(attachPrefix('ל', 'שְׁמוֹנֶה')).toBe(N('לִשְׁמוֹנֶה'))
    expect(attachPrefix('ב', 'חֲמִשִּׁים')).toBe(N('בַּחֲמִשִּׁים'))
    expect(attachPrefix('מ', 'אַרְבַּע')).toBe(N('מֵאַרְבַּע'))
    expect(attachPrefix('מ', 'שֵׁשׁ')).toBe(N('מִשֵׁשׁ'))
  })
})

describe('coverSentence', () => {
  const vocab = new Set([...numberPhrases(), ...N(['כַּמָּה', 'זֶה', 'כַּמָּה זֶה', 'חֲצִי', 'יֵשׁ'])])
  const has = (k: string) => vocab.has(k)

  it('prefers the fewest clips and stitches numbers in', () => {
    const [s] = toSentences('כַּמָּה זֶה 253?')
    expect(coverSentence(s, has)?.map((p) => p.key)).toEqual(N(['כַּמָּה זֶה', 'מָאתַיִם', 'חֲמִשִּׁים וְשָׁלוֹשׁ']))
  })

  it('covers every number 0–1000 with or without a prefix', () => {
    for (let n = 0; n <= 1000; n++) {
      for (const p of ['', 'לְ־', 'מִ־', 'וְ־', 'בְּ־']) {
        const [s] = toSentences(`${p}${n}`)
        expect(coverSentence(s, has), `${p}${n}`).not.toBeNull()
      }
    }
  })

  it('returns null when a word has no clip', () => {
    expect(coverSentence(toSentences('שָׁלוֹם דָּנָה')[0], has)).toBeNull()
  })
})

describe('recorded phrases', () => {
  const phrases = new Set(phraseList.map((p) => p.key))
  const has = (k: string) => phrases.has(k)
  const missing = new Set<string>()
  const check = (t: string) => {
    for (const s of toSentences(t)) if (!coverSentence(s, has)) missing.add(s.map((w) => w.say).join(' '))
  }

  it('cover exercises, feedback and lessons (run `npm run speech:collect` after changing text)', () => {
    for (const gen of Object.values(SKILLS)) {
      for (const d of [1, 2, 3] as Difficulty[]) {
        for (let seed = 0; seed < 60; seed++) {
          const ex = gen(d, createRng(1_000_003 + seed * 31 + d)) as Exercise
          for (const gd of ['f', 'm'] as const) {
            if (ex.story) check(tx(ex.story, gd))
            check(tx(ex.instruction, gd))
            check(tx(ex.hint, gd))
            check(tx(analyzeAnswer(ex, [ex.answers[0] + 1]).message, gd))
          }
          if (ex.tokens) check(tokensForSpeech(ex.tokens))
          if (ex.choices) check(choicesForSpeech(ex.choices))
        }
      }
    }
    for (const slides of Object.values(LESSONS)) for (const s of slides) for (const gd of ['f', 'm'] as const) check(tx(s.text, gd))
    expect([...missing]).toEqual([])
  })
})

describe('device speech chunks', () => {
  it('keeps every chunk short enough for Chrome', () => {
    const long = 'אַחַת שְׁתַּיִם שָׁלוֹשׁ, אַרְבַּע חָמֵשׁ. '.repeat(20)
    const chunks = chunkText(long, 60)
    expect(chunks.every((c) => c.length <= 60)).toBe(true)
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(long.trim().replace(/\s+/g, ' '))
  })
})

describe('trimClip', () => {
  it('cuts silent edges and fades in and out', () => {
    const rate = 24000
    const data = new Float32Array(rate)
    for (let i = 6000; i < 18000; i++) data[i] = 0.5 * Math.sin(i / 5)
    const out = trimClip(data, rate)
    expect(out.length).toBeLessThan(13500)
    expect(out.length).toBeGreaterThan(12000)
    expect(Math.abs(out[0])).toBe(0)
    expect(Math.abs(out[out.length - 1])).toBeLessThan(0.01)
  })
})
