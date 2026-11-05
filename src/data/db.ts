import Dexie, { type EntityTable, type Table } from 'dexie'
import type { Gender } from '../content/he/text'
import type { TopicProgress } from '../engine/adaptive'
import type { Attempt, UsageRecord } from '../engine/stats'
import type { TopicId } from '../exercises/types'
import type { Pt } from '../handwriting/pdollar'

export type Avatar = 'princess' | 'prince' | 'animal'
export type Companion = 'unicorn' | 'bunny' | 'fox' | 'kitten'

export interface ProfileSettings {
  reducedMotion?: boolean
  mute?: boolean
  unlockAll?: boolean
  handwriting?: boolean
}

export interface Profile {
  id?: number
  name: string
  gender: Gender
  avatar: Avatar
  companion: Companion
  createdAt: number
  placementDone: boolean
  settings: ProfileSettings
}

export interface ProgressRow extends TopicProgress {
  profileId: number
}

export interface BadgeRow {
  profileId: number
  badgeId: string
  topicId?: TopicId
  level?: number
  earnedAt: number
}

export interface DigitSample {
  id?: number
  profileId: number
  digit: number
  points: Pt[]
  ts: number
}

export interface GameBest {
  profileId: number
  gameId: string
  best: number
  plays: number
}

export const db = new Dexie('math-kingdom') as Dexie & {
  profiles: EntityTable<Profile, 'id'>
  progress: Table<ProgressRow, [number, string]>
  attempts: EntityTable<Attempt, 'id'>
  usage: Table<UsageRecord, [number, string, number]>
  badges: Table<BadgeRow, [number, string]>
  digitSamples: EntityTable<DigitSample, 'id'>
  gameBest: Table<GameBest, [number, string]>
}

db.version(1).stores({
  profiles: '++id',
  progress: '[profileId+topicId], profileId',
  attempts: '++id, profileId, [profileId+topicId], ts',
  usage: '[profileId+date+hour], profileId',
  badges: '[profileId+badgeId], profileId',
  digitSamples: '++id, profileId, [profileId+digit]',
  gameBest: '[profileId+gameId], profileId',
})

export async function deleteProfile(profileId: number) {
  await db.transaction('rw', ['profiles', 'progress', 'attempts', 'usage', 'badges', 'digitSamples', 'gameBest'], async () => {
    await db.profiles.delete(profileId)
    for (const name of ['progress', 'attempts', 'usage', 'badges', 'digitSamples', 'gameBest']) {
      await db.table(name).where('profileId').equals(profileId).delete()
    }
  })
}

export async function resetProgress(profileId: number) {
  await db.transaction('rw', ['profiles', 'progress', 'attempts', 'badges'], async () => {
    await db.progress.where('profileId').equals(profileId).delete()
    await db.attempts.where('profileId').equals(profileId).delete()
    await db.badges.where('profileId').equals(profileId).delete()
    await db.profiles.update(profileId, { placementDone: false })
  })
}

export async function addUsage(profileId: number, seconds: number, now = new Date()) {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const key = { profileId, date, hour: now.getHours() }
  await db.transaction('rw', 'usage', async () => {
    const row = await db.usage.get([profileId, date, now.getHours()])
    if (row) await db.usage.update([profileId, date, now.getHours()], { seconds: row.seconds + seconds })
    else await db.usage.add({ ...key, weekday: now.getDay(), seconds })
  })
}

const MAX_SAMPLES_PER_DIGIT = 5

export async function addDigitSample(profileId: number, digit: number, points: Pt[]) {
  const existing = await db.digitSamples.where({ profileId, digit }).sortBy('ts')
  if (existing.length >= MAX_SAMPLES_PER_DIGIT) await db.digitSamples.delete(existing[0].id!)
  await db.digitSamples.add({ profileId, digit, points, ts: Date.now() })
}
