import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useGuide } from '../app/useGuide'
import { Character } from '../components/Characters'
import { Screen } from '../components/Chrome'
import { g } from '../content/he/text'
import { TOPICS } from '../curriculum/topics'
import { db } from '../data/db'
import { isTopicMastered, isTopicUnlocked, type TopicProgress } from '../engine/adaptive'
import { speak } from '../speech/speech'

export function useAllProgress() {
  const { profileId } = useApp()
  return useLiveQuery(async () => {
    if (!profileId) return [] as (TopicProgress | undefined)[]
    const rows = await db.progress.where('profileId').equals(profileId).toArray()
    return TOPICS.map((t) => rows.find((r) => r.topicId === t.id))
  }, [profileId])
}

export function MapScreen() {
  const nav = useNavigate()
  const { profile, t } = useApp()
  const { hero } = useGuide()
  const progress = useAllProgress()
  const unlockAll = !!profile?.settings.unlockAll

  useEffect(() => {
    if (profile) void speak(t(g(`שָׁלוֹם ${profile.name}! לְאָן הוֹלְכִים הַיּוֹם? בַּחֲרִי אֶרֶץ בַּמַּפָּה.`, `שָׁלוֹם ${profile.name}! לְאָן הוֹלְכִים הַיּוֹם? בְּחַר אֶרֶץ בַּמַּפָּה.`)))
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile || !progress) return null

  return (
    <Screen className="map">
      <header className="map-top">
        <button type="button" className="icon-btn" onClick={() => nav('/profiles')} aria-label="החלפת שחקן">
          <Character kind={hero} size={40} talkWithSpeech={false} />
        </button>
        <h1 className="map-title">{profile.name}</h1>
        <button type="button" className="icon-btn" onClick={() => nav('/games')} aria-label="משחקים">
          🎮
        </button>
        <button type="button" className="icon-btn" onClick={() => nav('/badges')} aria-label="אוסף התגים">
          🏅
        </button>
      </header>
      <ol className="map-path">
        {TOPICS.map((topic, i) => {
          const p = progress[i]
          const unlocked = isTopicUnlocked(i, progress, unlockAll)
          const mastered = p ? isTopicMastered(p) : false
          const passed = p?.passedLevels ?? 0
          return (
            <li key={topic.id} className={`land ${i % 2 ? 'alt' : ''}`}>
              <motion.button
                type="button"
                className={`land-btn ${unlocked ? '' : 'locked'}`}
                style={{ ['--land' as string]: topic.land.color, ['--land-soft' as string]: topic.land.soft }}
                disabled={!unlocked}
                onClick={() => nav(`/topic/${topic.id}`)}
                whileTap={{ scale: 0.95 }}
                aria-label={`${topic.land.name}, ${topic.title}${unlocked ? '' : ' (נעול)'}`}
              >
                <span className="land-emoji" aria-hidden>
                  {unlocked ? topic.land.emoji : '🔒'}
                </span>
                {mastered && (
                  <span className="land-crown" aria-hidden>
                    👑
                  </span>
                )}
              </motion.button>
              <div className="land-info">
                <span className="land-name">{topic.land.name}</span>
                <span className="land-topic">{topic.title}</span>
                <span className="land-stars" aria-label={`${passed} מתוך ${topic.levels.length} רמות`}>
                  {topic.levels.map((_, k) => (k < passed ? '⭐' : '☆')).join(' ')}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </Screen>
  )
}
