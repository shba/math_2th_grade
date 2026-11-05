import { describe, expect, it } from 'vitest'
import { tx } from '../content/he/text'
import { equation } from '../exercises/helpers'
import type { Exercise } from '../exercises/types'
import { analyzeAnswer, mirroredTip, noRegroupValues, wrongOperationValue } from './errorAnalysis'

const ex = (a: number, op: '+' | '-' | '×' | ':', b: number, unknown: 'result' | 'a' | 'b' = 'result'): Exercise => ({
  ...equation(a, op, b, unknown),
  id: 'x',
  topicId: 'add-sub-20',
  skillId: 's',
  level: 1,
  difficulty: 1,
  instruction: 'פִּתְרִי',
  icon: 'pencil',
  hint: 'רֶמֶז',
})

describe('analyzeAnswer', () => {
  it('detects reversed digits, like 16 − 4 answered as 21', () => {
    const r = analyzeAnswer(ex(16, '-', 4), [21])
    expect(r.type).toBe('reversed-digits')
    expect(tx(r.message, 'f')).toContain('כָּתַבְתְּ')
    expect(tx(r.message, 'm')).toContain('כָּתַבְתָּ')
  })

  it('detects adding instead of subtracting', () => {
    expect(analyzeAnswer(ex(15, '-', 3), [18]).type).toBe('wrong-operation')
    expect(analyzeAnswer(ex(9, '+', 4), [5]).type).toBe('wrong-operation')
  })

  it('detects wrong operation on a missing-number exercise (3 + __ = 18 answered 21)', () => {
    expect(analyzeAnswer(ex(3, '+', 15, 'b'), [21]).type).toBe('wrong-operation')
    expect(analyzeAnswer(ex(18, '-', 6, 'b'), [30]).type).toBe('wrong-operation')
  })

  it('detects forgotten borrowing in 20 − 16 and forgotten carrying in 27 + 15', () => {
    expect(analyzeAnswer(ex(20, '-', 16), [16]).type).toBe('no-regroup')
    expect(analyzeAnswer(ex(20, '-', 16), [14]).type).toBe('no-regroup')
    expect(analyzeAnswer(ex(27, '+', 15), [32]).type).toBe('no-regroup')
    expect(analyzeAnswer(ex(52, '-', 17), [45]).type).toBe('no-regroup')
  })

  it('detects off-by-one', () => {
    expect(analyzeAnswer(ex(8, '+', 5), [12]).type).toBe('off-by-one')
    expect(analyzeAnswer(ex(8, '+', 5), [14]).type).toBe('off-by-one')
  })

  it('detects tens mistakes when the ones digit is right', () => {
    expect(analyzeAnswer(ex(34, '+', 20), [74]).type).toBe('place-value')
  })

  it('detects multiplication-table neighbours and addition instead of multiplication', () => {
    expect(analyzeAnswer(ex(6, '×', 7), [48]).type).toBe('table-neighbor')
    expect(analyzeAnswer(ex(3, '×', 4), [7]).type).toBe('wrong-operation')
  })

  it('falls back to "other" with the hint, e.g. 20 − 16 = 9', () => {
    const r = analyzeAnswer(ex(20, '-', 16), [9])
    expect(r.type).toBe('other')
    expect(tx(r.message, 'f')).toContain('רֶמֶז')
  })

  it('explains open-ended answers by computing what the child wrote', () => {
    const e: Exercise = { ...ex(10, '+', 5), tokens: [{ t: 'blank', i: 0 }, { t: 'op', v: '+' }, { t: 'blank', i: 1 }, { t: 'op', v: '=' }, { t: 'n', v: 15 }], validate: ([a, b]) => a + b === 15 }
    const r = analyzeAnswer(e, [7, 9])
    expect(tx(r.message, 'f')).toContain('7 + 9 = 16')
  })

  it('carries mirrored digits through and builds a tip', () => {
    expect(analyzeAnswer(ex(8, '+', 5), [12], { mirrored: [2] }).mirrored).toEqual([2])
    const tip = mirroredTip([3])
    expect(tip.type).toBe('mirrored-digit')
    expect(tx(tip.message, 'f')).toContain('3')
  })
})

describe('helpers', () => {
  it('computes column-wise no-regroup answers', () => {
    expect(noRegroupValues(45, '+', 38)).toEqual([73])
    expect(noRegroupValues(43, '+', 25)).toEqual([])
    expect(noRegroupValues(70, '-', 18)).toEqual([68, 62])
  })
  it('computes the opposite-operation value', () => {
    expect(wrongOperationValue(ex(20, '-', 6))).toBe(26)
    expect(wrongOperationValue(ex(12, '+', 6, 'a'))).toBe(24)
  })
})
