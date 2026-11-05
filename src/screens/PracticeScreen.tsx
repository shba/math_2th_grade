import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useGuide } from '../app/useGuide'
import { Character } from '../components/Characters'
import { Screen, TopBar } from '../components/Chrome'
import { ExerciseView, type ExerciseResult } from '../components/ExerciseView'
import { g } from '../content/he/text'
import { topicById } from '../curriculum/topics'
import { checkEffortBadges, getProgress, recordAttempt, saveProgress } from '../data/repo'
import { applyPracticeAnswer, currentLevel, isTestReady, TEST_UNLOCK_CORRECT, type TopicProgress } from '../engine/adaptive'
import { generateExercise } from '../exercises/registry'
import { createRng } from '../exercises/rng'
import type { Exercise, TopicId } from '../exercises/types'
import { speak } from '../speech/speech'

const SESSION_KEY = 'mk-session-start'
const REST_AFTER_MS = 15 * 60 * 1000

export function PracticeScreen() {
  const { topicId } = useParams<{ topicId: TopicId }>()
  const nav = useNavigate()
  const { profileId, profile, t } = useApp()
  const { hero } = useGuide()
  const topic = topicById(topicId!)
  const rng = useRef(createRng())
  const [progress, setProgress] = useState<TopicProgress | null>(null)
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [rest, setRest] = useState(false)
  const restShown = useRef(false)

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, String(Date.now()))
    if (!profileId) return
    void getProgress(profileId, topic.id).then((p) => {
      setProgress(p)
      setExercise(generateExercise(topic.id, currentLevel(p), p.difficulty, rng.current))
    })
  }, [profileId, topic.id])

  const onDone = async (r: ExerciseResult) => {
    if (!progress || !exercise || !profileId) return
    const { progress: next, event } = applyPracticeAnswer(progress, r.correct)
    await saveProgress(profileId, next)
    await recordAttempt({
      profileId,
      topicId: topic.id,
      skillId: exercise.skillId,
      level: exercise.level,
      difficulty: exercise.difficulty,
      correct: r.correct,
      errorType: r.errorType,
      mirrored: r.mirrored,
      mode: 'practice',
      input: r.input,
      ts: Date.now(),
      ms: r.ms,
    })
    void checkEffortBadges(profileId)
    setProgress(next)
    if (event === 'harder') setToast(t(g('🚀 אֶתְגָּר קָשֶׁה יוֹתֵר! אַתְּ מוּכָנָה.', '🚀 אֶתְגָּר קָשֶׁה יוֹתֵר! אַתָּה מוּכָן.')))
    else if (event === 'easier') setToast('🌱 נְתַרְגֵּל רֶגַע מַשֶּׁהוּ קַל יוֹתֵר.')
    else setToast(null)
    if (isTestReady(next) && !isTestReady(progress)) {
      void speak(t(g('וָאוּ! אַתְּ מוּכָנָה לְמִבְחַן הָרָמָה!', 'וָאוּ! אַתָּה מוּכָן לְמִבְחַן הָרָמָה!')))
    }
    const started = Number(sessionStorage.getItem(SESSION_KEY) ?? Date.now())
    if (!restShown.current && Date.now() - started > REST_AFTER_MS) {
      restShown.current = true
      setRest(true)
      void speak(t(g('עָבַדְתְּ יָפֶה הַיּוֹם! אֶפְשָׁר לָנוּחַ עַכְשָׁו, וְלַחְזֹר מָחָר.', 'עָבַדְתָּ יָפֶה הַיּוֹם! אֶפְשָׁר לָנוּחַ עַכְשָׁו, וְלַחְזֹר מָחָר.')))
    }
    setExercise(generateExercise(topic.id, currentLevel(next), next.difficulty, rng.current, { avoid: exercise, skillId: r.correct ? undefined : exercise.skillId }))
  }

  if (!progress || !exercise) return null
  const ready = isTestReady(progress)

  return (
    <Screen className="practice fit" style={{ ['--land' as string]: topic.land.color, ['--land-soft' as string]: topic.land.soft }}>
      <TopBar
        back={`/topic/${topic.id}`}
        title={
          <div className="test-progress small" aria-label={`${Math.min(progress.levelCorrect, TEST_UNLOCK_CORRECT)} מתוך ${TEST_UNLOCK_CORRECT} כוכבים`}>
            {Array.from({ length: TEST_UNLOCK_CORRECT }, (_, i) => (
              <span key={i} className={i < progress.levelCorrect ? 'on' : ''} aria-hidden>
                ⭐
              </span>
            ))}
          </div>
        }
        right={
          ready ? (
            <button type="button" className="btn accent pulse" onClick={() => nav(`/test/${topic.id}`)}>
              🏆 מִבְחָן
            </button>
          ) : undefined
        }
      />
      <AnimatePresence>
        {toast && (
          <motion.div className="toast" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onAnimationComplete={() => setTimeout(() => setToast(null), 2500)}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <ExerciseView key={exercise.id} exercise={exercise} mode="practice" guide={hero} onDone={onDone} handwritingDefault={profile?.settings.handwriting ?? true} />
      {rest && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="הפסקה">
          <div className="modal-card">
            <span className="big-emoji" aria-hidden>
              🌙
            </span>
            <Character kind={hero} size={100} mood="cheer" />
            <p className="speech-bubble">{t(g('עָבַדְתְּ יָפֶה הַיּוֹם! אֶפְשָׁר לָנוּחַ עַכְשָׁו, וְלַחְזֹר מָחָר.', 'עָבַדְתָּ יָפֶה הַיּוֹם! אֶפְשָׁר לָנוּחַ עַכְשָׁו, וְלַחְזֹר מָחָר.'))}</p>
            <div className="row">
              <button type="button" className="btn primary big" onClick={() => nav('/map')}>
                🏰 לַמַּפָּה
              </button>
              <button type="button" className="btn ghost big" onClick={() => setRest(false)}>
                עוֹד קְצָת
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  )
}
