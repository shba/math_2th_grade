import { topicById } from '../curriculum/topics'
import type { Difficulty, TopicId } from '../exercises/types'

export interface TopicProgress {
  topicId: TopicId
  /** Number of levels whose level test was passed (0 … levels.length). */
  passedLevels: number
  difficulty: Difficulty
  streak: number
  wrongStreak: number
  /** Correct practice answers in the current level since the last test. */
  levelCorrect: number
  lessonSeen: boolean
  testsTaken: number
  lastTestScore?: number
}

export const STREAK_UP = 3
export const WRONG_DOWN = 2
export const TEST_UNLOCK_CORRECT = 8
export const TEST_LENGTH = 8
export const PASS_RATIO = 0.8

export function initialProgress(topicId: TopicId, passedLevels = 0): TopicProgress {
  return { topicId, passedLevels, difficulty: 1, streak: 0, wrongStreak: 0, levelCorrect: 0, lessonSeen: false, testsTaken: 0 }
}

export const levelCount = (topicId: TopicId) => topicById(topicId).levels.length

export function currentLevel(p: TopicProgress): number {
  return Math.min(p.passedLevels + 1, levelCount(p.topicId))
}

export const isTopicMastered = (p: TopicProgress) => p.passedLevels >= levelCount(p.topicId)

export type AdaptEvent = 'harder' | 'easier' | null

/** Practice update: a streak of correct answers raises difficulty; repeated mistakes lower it and show a hint. */
export function applyPracticeAnswer(p: TopicProgress, correct: boolean): { progress: TopicProgress; event: AdaptEvent; showHint: boolean } {
  const next = { ...p }
  let event: AdaptEvent = null
  if (correct) {
    next.streak++
    next.wrongStreak = 0
    next.levelCorrect++
    if (next.streak >= STREAK_UP && next.difficulty < 3) {
      next.difficulty = (next.difficulty + 1) as Difficulty
      next.streak = 0
      event = 'harder'
    }
  } else {
    next.wrongStreak++
    next.streak = 0
    if (next.wrongStreak >= WRONG_DOWN && next.difficulty > 1) {
      next.difficulty = (next.difficulty - 1) as Difficulty
      next.wrongStreak = 0
      event = 'easier'
    }
  }
  return { progress: next, event, showHint: !correct }
}

export const isTestReady = (p: TopicProgress) => !isTopicMastered(p) && p.levelCorrect >= TEST_UNLOCK_CORRECT

export const testPassed = (correct: number, total: number) => total > 0 && correct / total >= PASS_RATIO

export function applyTestResult(p: TopicProgress, correct: number, total: number): { progress: TopicProgress; passed: boolean; topicMastered: boolean } {
  const passed = testPassed(correct, total)
  const next: TopicProgress = { ...p, testsTaken: p.testsTaken + 1, lastTestScore: correct / total }
  if (passed) {
    next.passedLevels = Math.min(p.passedLevels + 1, levelCount(p.topicId))
    next.difficulty = 1
    next.levelCorrect = 0
    next.streak = 0
    next.wrongStreak = 0
  } else {
    // Back to practice, a little easier, with half of the earned practice kept.
    next.levelCorrect = Math.floor(p.levelCorrect / 2)
    next.difficulty = Math.max(1, p.difficulty - 1) as Difficulty
  }
  return { progress: next, passed, topicMastered: isTopicMastered(next) }
}

/** The topic's land opens once the previous topic has at least one passed level. */
export function isTopicUnlocked(index: number, progressList: (TopicProgress | undefined)[], unlockAll = false): boolean {
  if (unlockAll || index === 0) return true
  const prev = progressList[index - 1]
  const own = progressList[index]
  return (own?.passedLevels ?? 0) > 0 || (prev?.passedLevels ?? 0) > 0
}
