import { describe, expect, it } from 'vitest'
import { numberToWords } from './numberWords'
import { tokensForSpeech } from './phrasing'
import type { Token } from '../exercises/types'
import { toSentences } from './speechText'

const N = (s: string) => s.normalize('NFC')

const spoken = (t: string) => toSentences(t).map((s) => s.map((w) => w.say).join(' ')).join(' ')

describe('numberToWords', () => {
  it('reads numbers in the feminine counting form', () => {
    expect(numberToWords(0)).toBe('אֶפֶס')
    expect(numberToWords(7)).toBe('שֶׁבַע')
    expect(numberToWords(12)).toBe('שְׁתֵּים־עֶשְׂרֵה')
    expect(numberToWords(20)).toBe('עֶשְׂרִים')
    expect(numberToWords(22)).toBe('עֶשְׂרִים וּשְׁתַּיִם')
    expect(numberToWords(35)).toBe('שְׁלוֹשִׁים וְחָמֵשׁ')
    expect(numberToWords(105)).toBe('מֵאָה וְחָמֵשׁ')
    expect(numberToWords(150)).toBe('מֵאָה וַחֲמִשִּׁים')
    expect(numberToWords(375)).toBe('שְׁלוֹשׁ מֵאוֹת שִׁבְעִים וְחָמֵשׁ')
    expect(numberToWords(1000)).toBe('אֶלֶף')
  })

  it('speaks equations as words', () => {
    const tokens = [{ t: 'n', v: 8 }, { t: 'op', v: '+' }, { t: 'n', v: 5 }, { t: 'op', v: '=' }, { t: 'blank', i: 0 }] as Token[]
    expect(tokensForSpeech(tokens)).toBe('8 וְעוֹד 5 שָׁוֶה כַּמָּה')
    expect(spoken(tokensForSpeech(tokens))).toBe(N('שְׁמוֹנֶה וְעוֹד חָמֵשׁ שָׁוֶה כַּמָּה'))
    expect(spoken('כַּמָּה עֲשָׂרוֹת יֵשׁ בַּמִּסְפָּר 47?')).toBe(N('כַּמָּה עֲשָׂרוֹת יֵשׁ בַּמִּסְפָּר אַרְבָּעִים וְשֶׁבַע?'))
    expect(spoken('הִתְחִיל בַּשָּׁעָה 4:30')).toBe(N('הִתְחִיל בַּשָּׁעָה אַרְבַּע וָחֵצִי'))
  })
})
