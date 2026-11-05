import { describe, expect, it } from 'vitest'
import {
  applyPracticeAnswer,
  applyTestResult,
  currentLevel,
  initialProgress,
  isTestReady,
  isTopicMastered,
  isTopicUnlocked,
  TEST_UNLOCK_CORRECT,
  type TopicProgress,
} from './adaptive'
import { answerPlacement, startPlacement } from './placement'
import { activeDays, dailyMinutes, errorCounts, hourHeatmap, topicStatus, type Attempt } from './stats'

const run = (p: TopicProgress, answers: boolean[]) => answers.reduce((s, c) => applyPracticeAnswer(s, c).progress, p)

describe('adaptive difficulty', () => {
  it('gets harder after 3 correct in a row and easier after 2 mistakes', () => {
    let p = initialProgress('add-sub-20')
    p = run(p, [true, true, true])
    expect(p.difficulty).toBe(2)
    p = run(p, [true, true, true])
    expect(p.difficulty).toBe(3)
    p = run(p, [true, true, true])
    expect(p.difficulty).toBe(3)
    const r = applyPracticeAnswer(p, false)
    expect(r.showHint).toBe(true)
    expect(r.event).toBe(null)
    const r2 = applyPracticeAnswer(r.progress, false)
    expect(r2.event).toBe('easier')
    expect(r2.progress.difficulty).toBe(2)
  })

  it('unlocks the level test after enough correct practice', () => {
    let p = initialProgress('add-sub-20')
    expect(isTestReady(p)).toBe(false)
    p = run(p, Array(TEST_UNLOCK_CORRECT).fill(true))
    expect(isTestReady(p)).toBe(true)
  })

  it('passes a level at 80% and stays on it below', () => {
    const p = { ...initialProgress('add-sub-20'), levelCorrect: 8, difficulty: 3 as const }
    const fail = applyTestResult(p, 6, 8)
    expect(fail.passed).toBe(false)
    expect(fail.progress.passedLevels).toBe(0)
    expect(fail.progress.difficulty).toBe(2)
    expect(isTestReady(fail.progress)).toBe(false)
    const pass = applyTestResult(p, 7, 8)
    expect(pass.passed).toBe(true)
    expect(currentLevel(pass.progress)).toBe(2)
    expect(pass.progress.difficulty).toBe(1)
  })

  it('masters a topic after the last level', () => {
    const p = { ...initialProgress('data'), passedLevels: 1, levelCorrect: 9 }
    const r = applyTestResult(p, 8, 8)
    expect(r.topicMastered).toBe(true)
    expect(isTopicMastered(r.progress)).toBe(true)
    expect(isTestReady(r.progress)).toBe(false)
  })

  it('unlocks the next land once the previous has a passed level', () => {
    const a = { ...initialProgress('add-sub-20'), passedLevels: 1 }
    expect(isTopicUnlocked(1, [a, undefined])).toBe(true)
    expect(isTopicUnlocked(2, [a, undefined, undefined])).toBe(false)
    expect(isTopicUnlocked(2, [a, undefined, undefined], true)).toBe(true)
  })
})

describe('placement', () => {
  it('stops a topic at the first miss and skips 2-digit work when facts to 20 are weak', () => {
    let s = startPlacement()
    s = answerPlacement(s, true)
    s = answerPlacement(s, true) // level 1 of add-sub-20 passed
    s = answerPlacement(s, false) // level 2 failed
    expect(s.results['add-sub-20']).toBe(1)
    expect(s.topicIdx).toBe(1)
    s = answerPlacement(s, false)
    expect(s.results['numbers-1000']).toBe(0)
    expect(s.results['add-sub-100']).toBe(0)
    expect(s.done).toBe(true)
  })

  it('places a strong child high', () => {
    let s = startPlacement()
    let guard = 0
    while (!s.done && guard++ < 100) s = answerPlacement(s, true)
    expect(s.results['add-sub-20']).toBe(4)
    expect(s.results['numbers-1000']).toBe(4)
    expect(s.results['add-sub-100']).toBe(4)
  })
})

describe('stats', () => {
  const at = (correct: boolean, extra: Partial<Attempt> = {}): Attempt => ({
    profileId: 1, topicId: 'add-sub-20', skillId: 'add20', level: 1, difficulty: 1, correct, mode: 'practice', input: 'keys', ts: 0, ms: 1000, ...extra,
  })

  it('marks a topic for reinforcement when recent accuracy is low', () => {
    const p = initialProgress('add-sub-20')
    expect(topicStatus(p, [])).toBe('new')
    expect(topicStatus(p, [at(true), at(true), at(true), at(true), at(true)])).toBe('progress')
    expect(topicStatus(p, [at(false), at(false), at(true), at(false), at(true)])).toBe('reinforce')
    expect(topicStatus({ ...p, passedLevels: 4 }, [at(true)])).toBe('mastered')
  })

  it('counts error types including mirrored digits', () => {
    const c = errorCounts([at(false, { errorType: 'reversed-digits' }), at(false, { errorType: 'reversed-digits' }), at(true, { mirrored: true })])
    expect(c[0]).toEqual(['reversed-digits', 2])
    expect(c[1]).toEqual(['mirrored-digit', 1])
  })

  it('aggregates daily minutes and the hour heatmap', () => {
    const today = new Date(2026, 10, 5, 12)
    const usage = [
      { profileId: 1, date: '2026-11-05', hour: 17, weekday: 4, seconds: 600 },
      { profileId: 1, date: '2026-11-05', hour: 18, weekday: 4, seconds: 300 },
      { profileId: 1, date: '2026-11-04', hour: 8, weekday: 3, seconds: 120 },
    ]
    const days = dailyMinutes(usage, 3, today)
    expect(days.map((d) => d.minutes)).toEqual([0, 2, 15])
    expect(hourHeatmap(usage)[4][17]).toBe(10)
    expect(activeDays(usage)).toBe(2)
  })
})
