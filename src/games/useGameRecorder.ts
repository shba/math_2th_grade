import { useApp } from '../app/AppContext'
import { db } from '../data/db'
import { recordAttempt } from '../data/repo'
import type { TopicId } from '../exercises/types'

export function useGameRecorder(gameId: string, topicId: TopicId) {
  const { profileId } = useApp()
  return {
    record: (correct: boolean, level = 1, skillId = gameId) => {
      if (!profileId) return
      void recordAttempt({ profileId, topicId, skillId: `game:${skillId}`, level, difficulty: 1, correct, mode: 'game', input: 'choice', ts: Date.now(), ms: 0 })
    },
    saveBest: async (score: number, lowerIsBetter = false) => {
      if (!profileId) return undefined
      const row = await db.gameBest.get([profileId, gameId])
      const better = !row || (lowerIsBetter ? score < row.best : score > row.best)
      await db.gameBest.put({ profileId, gameId, best: better ? score : row!.best, plays: (row?.plays ?? 0) + 1 })
      return { best: better ? score : row!.best, isNew: better, previous: row?.best }
    },
    getBest: async () => (profileId ? (await db.gameBest.get([profileId, gameId]))?.best : undefined),
  }
}
