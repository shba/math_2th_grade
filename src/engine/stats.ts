import type { TopicId } from '../exercises/types'
import { isTopicMastered, type TopicProgress } from './adaptive'
import type { ErrorType } from './errorAnalysis'

export type AttemptMode = 'practice' | 'test' | 'placement' | 'game'
export type InputMode = 'hand' | 'keys' | 'choice'

export interface Attempt {
  id?: number
  profileId: number
  topicId: TopicId
  skillId: string
  level: number
  difficulty: number
  correct: boolean
  errorType?: ErrorType
  mirrored?: boolean
  mode: AttemptMode
  input: InputMode
  ts: number
  ms: number
}

export interface UsageRecord {
  profileId: number
  /** Local date, YYYY-MM-DD. */
  date: string
  hour: number
  weekday: number
  seconds: number
}

export type TopicStatus = 'mastered' | 'reinforce' | 'progress' | 'new'

export const RECENT_WINDOW = 15
export const REINFORCE_BELOW = 0.7

export function topicStatus(progress: TopicProgress | undefined, attempts: Attempt[]): TopicStatus {
  const mine = attempts.filter((a) => a.topicId === progress?.topicId && a.mode !== 'game')
  if (progress && isTopicMastered(progress)) {
    const recent = mine.slice(-RECENT_WINDOW)
    if (recent.length >= 5 && accuracy(recent) < REINFORCE_BELOW) return 'reinforce'
    return 'mastered'
  }
  if (!mine.length) return 'new'
  const recent = mine.slice(-RECENT_WINDOW)
  if ((recent.length >= 5 && accuracy(recent) < REINFORCE_BELOW) || (progress?.lastTestScore ?? 1) < 0.8) return 'reinforce'
  return 'progress'
}

export const accuracy = (list: Attempt[]) => (list.length ? list.filter((a) => a.correct).length / list.length : 0)

export function errorCounts(attempts: Attempt[]): [ErrorType, number][] {
  const m = new Map<ErrorType, number>()
  for (const a of attempts) {
    if (a.errorType) m.set(a.errorType, (m.get(a.errorType) ?? 0) + 1)
    if (a.mirrored && a.errorType !== 'mirrored-digit') m.set('mirrored-digit', (m.get('mirrored-digit') ?? 0) + 1)
  }
  return [...m.entries()].sort((x, y) => y[1] - x[1])
}

export const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function dailyMinutes(usage: UsageRecord[], days = 14, today = new Date()): { date: string; minutes: number }[] {
  const out: { date: string; minutes: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = localDate(d)
    const secs = usage.filter((u) => u.date === key).reduce((s, u) => s + u.seconds, 0)
    out.push({ date: key, minutes: Math.round(secs / 6) / 10 })
  }
  return out
}

/** Minutes per weekday (0 = Sunday) × hour of day. */
export function hourHeatmap(usage: UsageRecord[]): number[][] {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  for (const u of usage) grid[u.weekday][u.hour] += u.seconds / 60
  return grid
}

export function activeDays(usage: UsageRecord[]): number {
  return new Set(usage.filter((u) => u.seconds >= 60).map((u) => u.date)).size
}

/** Levels passed in the last 7 and 28 days. */
export function pace(levelPassTimes: number[], now = Date.now()): { week: number; month: number } {
  const day = 86400000
  return {
    week: levelPassTimes.filter((t) => now - t <= 7 * day).length,
    month: levelPassTimes.filter((t) => now - t <= 28 * day).length,
  }
}
