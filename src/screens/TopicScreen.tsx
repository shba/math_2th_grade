import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useGuide } from '../app/useGuide'
import { Character } from '../components/Characters'
import { BadgeIcon, Screen, TopBar } from '../components/Chrome'
import { g } from '../content/he/text'
import { topicById } from '../curriculum/topics'
import { db } from '../data/db'
import { getProgress } from '../data/repo'
import { currentLevel, isTestReady, isTopicMastered, TEST_UNLOCK_CORRECT } from '../engine/adaptive'
import type { TopicId } from '../exercises/types'
import { GAMES_FOR_TOPIC } from '../games/registry'
import { speak } from '../speech/speech'

export function TopicScreen() {
  const { topicId } = useParams<{ topicId: TopicId }>()
  const nav = useNavigate()
  const { profileId, t } = useApp()
  const { hero } = useGuide()
  const topic = topicById(topicId!)
  const progress = useLiveQuery(() => (profileId ? getProgress(profileId, topic.id) : undefined), [profileId, topic.id])
  const badges = useLiveQuery(() => (profileId ? db.badges.where('profileId').equals(profileId).toArray() : []), [profileId])

  useEffect(() => {
    if (progress && !progress.lessonSeen) nav(`/lesson/${topic.id}`, { replace: true })
  }, [progress, nav, topic.id])

  const mastered = progress ? isTopicMastered(progress) : false
  const level = progress ? currentLevel(progress) : 1
  const ready = progress ? isTestReady(progress) : false
  const levelDef = topic.levels[level - 1]

  useEffect(() => {
    if (!progress?.lessonSeen) return
    void speak(mastered ? t(g('כׇּל הַכָּבוֹד! סִיַּמְתְּ אֶת כׇּל הָרָמוֹת כָּאן. אֶפְשָׁר לְהַמְשִׁיךְ לְתַרְגֵּל אוֹ לְשַׂחֵק.', 'כׇּל הַכָּבוֹד! סִיַּמְתָּ אֶת כׇּל הָרָמוֹת כָּאן. אֶפְשָׁר לְהַמְשִׁיךְ לְתַרְגֵּל אוֹ לְשַׂחֵק.')) : `${topic.land.name}. ${levelDef.title}.`)
  }, [progress?.lessonSeen, level]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!progress) return null
  const earned = new Set(badges?.map((b) => b.badgeId))
  const games = GAMES_FOR_TOPIC[topic.id] ?? []

  return (
    <Screen className="topic" style={{ ['--land' as string]: topic.land.color, ['--land-soft' as string]: topic.land.soft }}>
      <TopBar title={<span className="land-title"><span aria-hidden>{topic.land.emoji}</span> {topic.land.name}</span>} />
      <div className="topic-hero">
        <Character kind={hero} size={96} />
        <div>
          <h1 className="title">{topic.title}</h1>
          {!mastered && <p className="subtitle">{levelDef.title}</p>}
        </div>
      </div>

      <ol className="levels">
        {topic.levels.map((l, i) => {
          const state = i < progress.passedLevels ? 'done' : i === progress.passedLevels ? 'now' : 'later'
          return (
            <li key={i} className={`level ${state}`}>
              <BadgeIcon badge={l.badge} earned={earned.has(l.badge.id)} size={48} />
              <span className="level-title">{l.title}</span>
              <span aria-hidden>{state === 'done' ? '✅' : state === 'now' ? '▶️' : ''}</span>
            </li>
          )
        })}
      </ol>

      {!mastered && (
        <div className="test-progress" aria-label={`התקדמות לקראת מבחן הרמה: ${Math.min(progress.levelCorrect, TEST_UNLOCK_CORRECT)} מתוך ${TEST_UNLOCK_CORRECT}`}>
          {Array.from({ length: TEST_UNLOCK_CORRECT }, (_, i) => (
            <span key={i} className={i < progress.levelCorrect ? 'on' : ''} aria-hidden>
              ⭐
            </span>
          ))}
        </div>
      )}

      <div className="topic-actions">
        <button type="button" className="btn primary huge" onClick={() => nav(`/practice/${topic.id}`)}>
          ✏️ תִּרְגּוּל
        </button>
        {ready && (
          <button type="button" className="btn accent huge pulse" onClick={() => nav(`/test/${topic.id}`)}>
            🏆 מִבְחַן רָמָה
          </button>
        )}
        <div className="row">
          <button type="button" className="btn ghost big" onClick={() => nav(`/lesson/${topic.id}`)}>
            📖 שִׁעוּר
          </button>
          {games.map((gm) => (
            <button key={gm.id} type="button" className="btn ghost big" onClick={() => nav(`/games/${gm.id}?topic=${topic.id}`)}>
              {gm.emoji} {gm.name}
            </button>
          ))}
        </div>
      </div>
    </Screen>
  )
}
