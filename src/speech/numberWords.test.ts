import { describe, expect, it } from 'vitest'
import { numberToWords } from './numberWords'
import { textForSpeech, tokensForSpeech } from './speech'

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
    expect(tokensForSpeech([{ t: 'n', v: 8 }, { t: 'op', v: '+' }, { t: 'n', v: 5 }, { t: 'op', v: '=' }, { t: 'blank', i: 0 }])).toBe(
      'שְׁמוֹנֶה וְעוֹד חָמֵשׁ שָׁוֶה כַּמָּה',
    )
    expect(textForSpeech('כַּמָּה עֲשָׂרוֹת יֵשׁ בַּמִּסְפָּר 47?')).toBe('כַּמָּה עֲשָׂרוֹת יֵשׁ בַּמִּסְפָּר אַרְבָּעִים וְשֶׁבַע?')
    expect(textForSpeech('הִתְחִיל בַּשָּׁעָה 4:30')).toBe('הִתְחִיל בַּשָּׁעָה אַרְבַּע וָחֵצִי')
  })
})
