import { EFFORT_BADGES, TOPICS, topicById } from '../curriculum/topics'
import { initialProgress, type TopicProgress } from '../engine/adaptive'
import { activeDays, type Attempt } from '../engine/stats'
import type { TopicId } from '../exercises/types'
import { db, type BadgeRow } from './db'

export async function getProgress(profileId: number, topicId: TopicId): Promise<TopicProgress> {
  const row = await db.progress.get([profileId, topicId])
  if (!row) return initialProgress(topicId)
  const { profileId: _ignored, ...p } = row
  void _ignored
  return p
}

export async function saveProgress(profileId: number, p: TopicProgress) {
  await db.progress.put({ ...p, profileId })
}

export async function recordAttempt(a: Attempt) {
  await db.attempts.add(a)
}

/** Returns the badge if it is new. */
export async function awardBadge(profileId: number, badgeId: string, extra: Partial<BadgeRow> = {}): Promise<boolean> {
  const exists = await db.badges.get([profileId, badgeId])
  if (exists) return false
  await db.badges.add({ profileId, badgeId, earnedAt: Date.now(), ...extra })
  return true
}

export async function awardLevelBadge(profileId: number, topicId: TopicId, level: number, mastered: boolean): Promise<string[]> {
  const t = topicById(topicId)
  const earned: string[] = []
  if (await awardBadge(profileId, t.levels[level - 1].badge.id, { topicId, level })) earned.push(t.levels[level - 1].badge.id)
  if (mastered && (await awardBadge(profileId, t.crown.id, { topicId }))) earned.push(t.crown.id)
  return earned
}

/** Effort badges reward showing up and practicing, never speed. */
export async function checkEffortBadges(profileId: number): Promise<string[]> {
  const usage = await db.usage.where('profileId').equals(profileId).toArray()
  const attempts = await db.attempts.where('profileId').equals(profileId).toArray()
  const days = activeDays(usage)
  const solved = attempts.filter((a) => a.correct).length
  const hand = attempts.some((a) => a.input === 'hand' && a.correct)
  const earned: string[] = []
  for (const b of EFFORT_BADGES) {
    const ok = b.rule === 'days3' ? days >= 3 : b.rule === 'days7' ? days >= 7 : b.rule === 'solved100' ? solved >= 100 : hand
    if (ok && (await awardBadge(profileId, b.id))) earned.push(b.id)
  }
  return earned
}

export async function applyPlacement(profileId: number, results: Partial<Record<TopicId, number>>) {
  for (const t of TOPICS) {
    const passed = results[t.id]
    if (passed === undefined) continue
    const existing = await getProgress(profileId, t.id)
    await saveProgress(profileId, { ...existing, passedLevels: Math.max(existing.passedLevels, passed), lessonSeen: existing.lessonSeen || passed > 0 })
  }
  await db.profiles.update(profileId, { placementDone: true })
}
