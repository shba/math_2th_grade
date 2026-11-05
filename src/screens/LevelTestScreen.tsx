import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useGuide } from '../app/useGuide'
import { Character } from '../components/Characters'
import { BadgeIcon, Confetti, ProgressDots, Screen, TopBar } from '../components/Chrome'
import { ExerciseView, type ExerciseResult } from '../components/ExerciseView'
import { g, join } from '../content/he/text'
import { topicById } from '../curriculum/topics'
import { awardLevelBadge, getProgress, recordAttempt, saveProgress } from '../data/repo'
import { applyTestResult, currentLevel, TEST_LENGTH, type TopicProgress } from '../engine/adaptive'
import { generateExercise } from '../exercises/registry'
import { createRng } from '../exercises/rng'
import type { Exercise, TopicId } from '../exercises/types'
import { speak } from '../speech/speech'

export function LevelTestScreen() {
  const { topicId } = useParams<{ topicId: TopicId }>()
  const nav = useNavigate()
  const { profileId, profile, t } = useApp()
  const { hero } = useGuide()
  const topic = topicById(topicId!)
  const rng = useRef(createRng())
  const [progress, setProgress] = useState<TopicProgress | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [idx, setIdx] = useState(-1)
  const [correct, setCorrect] = useState(0)
  const [result, setResult] = useState<{ passed: boolean; mastered: boolean; level: number } | null>(null)

  useEffect(() => {
    if (!profileId) return
    void getProgress(profileId, topic.id).then((p) => {
      setProgress(p)
      const level = currentLevel(p)
      const def = topic.levels[level - 1]
      const skills = def.skills
      // Cover every skill of the level, mostly at the top difficulty.
      const list = Array.from({ length: TEST_LENGTH }, (_, i) => generateExercise(topic.id, level, i % 3 === 0 ? 2 : 3, rng.current, { skillId: skills[i % skills.length] }))
      setExercises(rng.current.shuffle(list))
    })
  }, [profileId, topic])

  const intro = g('מִבְחַן רָמָה! 8 שְׁאֵלוֹת. בְּלִי לְמַהֵר — יֵשׁ לָךְ כׇּל הַזְּמַן שֶׁבָּעוֹלָם.', 'מִבְחַן רָמָה! 8 שְׁאֵלוֹת. בְּלִי לְמַהֵר — יֵשׁ לְךָ כׇּל הַזְּמַן שֶׁבָּעוֹלָם.')
  useEffect(() => {
    if (idx === -1 && exercises.length) void speak(t(intro))
  }, [exercises.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const onDone = async (r: ExerciseResult) => {
    if (!profileId || !progress) return
    const ex = exercises[idx]
    await recordAttempt({ profileId, topicId: topic.id, skillId: ex.skillId, level: ex.level, difficulty: ex.difficulty, correct: r.correct, errorType: r.errorType, mirrored: r.mirrored, mode: 'test', input: r.input, ts: Date.now(), ms: r.ms })
    const c = correct + (r.correct ? 1 : 0)
    setCorrect(c)
    if (idx + 1 < exercises.length) {
      setIdx(idx + 1)
      return
    }
    const level = currentLevel(progress)
    const res = applyTestResult(progress, c, exercises.length)
    await saveProgress(profileId, res.progress)
    if (res.passed) await awardLevelBadge(profileId, topic.id, level, res.topicMastered)
    setResult({ passed: res.passed, mastered: res.topicMastered, level })
    const badge = topic.levels[level - 1].badge
    void speak(
      t(
        res.passed
          ? join(
              g(`הִצְלַחְתְּ! ${c} מִתּוֹךְ ${exercises.length}. קִבַּלְתְּ תָּג חָדָשׁ: ${badge.name}!`, `הִצְלַחְתָּ! ${c} מִתּוֹךְ ${exercises.length}. קִבַּלְתָּ תָּג חָדָשׁ: ${badge.name}!`),
              res.topicMastered ? 'וְגַם כֶּתֶר!' : '',
            )
          : join(`${c} מִתּוֹךְ ${exercises.length}.`, g('כִּמְעַט! עוֹד קְצָת תִּרְגּוּל, וְתַצְלִיחִי.', 'כִּמְעַט! עוֹד קְצָת תִּרְגּוּל, וְתַצְלִיחַ.')),
      ),
    )
  }

  if (!progress || !exercises.length) return null

  if (result) {
    const badge = topic.levels[result.level - 1].badge
    return (
      <Screen className="center-screen">
        {result.passed && <Confetti />}
        <Character kind={hero} size={130} mood={result.passed ? 'cheer' : 'idle'} />
        <p className="score">
          <bdi dir="ltr">
            {correct} / {exercises.length}
          </bdi>
        </p>
        {result.passed ? (
          <>
            <div className="badge-reveal">
              <BadgeIcon badge={badge} size={120} />
              {result.mastered && <BadgeIcon badge={topic.crown} size={120} />}
            </div>
            <p className="speech-bubble big">
              {t(g('הִצְלַחְתְּ! תָּג חָדָשׁ לָאוֹסֶף:', 'הִצְלַחְתָּ! תָּג חָדָשׁ לָאוֹסֶף:'))} {badge.name}
              {result.mastered ? ' 👑' : ''}
            </p>
          </>
        ) : (
          <p className="speech-bubble big">{t(g('כִּמְעַט! עוֹד קְצָת תִּרְגּוּל, וְתַצְלִיחִי.', 'כִּמְעַט! עוֹד קְצָת תִּרְגּוּל, וְתַצְלִיחַ.'))}</p>
        )}
        <div className="row">
          <button type="button" className="btn primary big" onClick={() => nav(`/topic/${topic.id}`, { replace: true })}>
            {result.passed ? 'מַמְשִׁיכִים ←' : '✏️ מְתַרְגְּלִים'}
          </button>
          {result.passed && (
            <button type="button" className="btn ghost big" onClick={() => nav('/badges')}>
              🏅 הָאוֹסֶף
            </button>
          )}
        </div>
      </Screen>
    )
  }

  if (idx === -1) {
    return (
      <Screen className="center-screen">
        <Character kind={hero} size={140} mood="talk" />
        <p className="speech-bubble big">{t(intro)}</p>
        <button type="button" className="btn accent huge" onClick={() => setIdx(0)}>
          🏆 מַתְחִילִים
        </button>
      </Screen>
    )
  }

  return (
    <Screen>
      <TopBar back={`/topic/${topic.id}`} title={<ProgressDots total={exercises.length} done={idx} />} />
      <ExerciseView key={exercises[idx].id} exercise={exercises[idx]} mode="test" guide={hero} onDone={onDone} handwritingDefault={profile?.settings.handwriting ?? true} />
    </Screen>
  )
}
