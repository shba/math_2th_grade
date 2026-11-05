import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useGuide } from '../app/useGuide'
import { Character } from '../components/Characters'
import { Confetti, Screen, TopBar } from '../components/Chrome'
import { ExerciseView, type ExerciseResult } from '../components/ExerciseView'
import { g, join } from '../content/he/text'
import { recordAttempt, applyPlacement } from '../data/repo'
import { answerPlacement, currentPlacementTopic, PLACEMENT_DIFFICULTY, placementMax, startPlacement } from '../engine/placement'
import { generateExercise } from '../exercises/registry'
import { createRng } from '../exercises/rng'
import { speak } from '../speech/speech'
import { useEffect } from 'react'

export function PlacementScreen() {
  const nav = useNavigate()
  const { profile, profileId, t } = useApp()
  const { hero, heroName } = useGuide()
  const rng = useRef(createRng())
  const [phase, setPhase] = useState<'intro' | 'test' | 'done'>('intro')
  const [state, setState] = useState(startPlacement)
  const [key, setKey] = useState(0)

  const exercise = useMemo(
    () => (state.done ? null : generateExercise(currentPlacementTopic(state), state.level, PLACEMENT_DIFFICULTY, rng.current)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.topicIdx, state.level, state.asked, state.done, key],
  )

  const intro = join(
    `שָׁלוֹם ${profile?.name ?? ''}!`,
    `אֲנִי ${heroName}.`,
    g('לִפְנֵי שֶׁיּוֹצְאִים לַמַּמְלָכָה, בּוֹאִי נִפְתֹּר כַּמָּה תַּרְגִּילִים קְטַנִּים,', 'לִפְנֵי שֶׁיּוֹצְאִים לַמַּמְלָכָה, בּוֹא נִפְתֹּר כַּמָּה תַּרְגִּילִים קְטַנִּים,'),
    'כְּדֵי שֶׁנֵּדַע מֵאֵיפֹה לְהַתְחִיל. אִם מַשֶּׁהוּ קָשֶׁה — זֶה בְּסֵדֶר גָּמוּר!',
  )
  const doneText = g('סִיַּמְתְּ! עַכְשָׁו יוֹצְאִים לְמַפַּת הַמַּמְלָכָה.', 'סִיַּמְתָּ! עַכְשָׁו יוֹצְאִים לְמַפַּת הַמַּמְלָכָה.')

  useEffect(() => {
    if (phase === 'intro') void speak(t(intro))
    if (phase === 'done') void speak(t(doneText))
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const onDone = async (r: ExerciseResult) => {
    if (!exercise || !profileId) return
    await recordAttempt({
      profileId,
      topicId: exercise.topicId,
      skillId: exercise.skillId,
      level: exercise.level,
      difficulty: exercise.difficulty,
      correct: r.correct,
      errorType: r.correct ? undefined : r.errorType,
      mirrored: r.mirrored,
      mode: 'placement',
      input: r.input,
      ts: Date.now(),
      ms: r.ms,
    })
    const next = answerPlacement(state, r.correct)
    setState(next)
    setKey((k) => k + 1)
    if (next.done) {
      await applyPlacement(profileId, next.results)
      setPhase('done')
    }
  }

  if (phase === 'intro') {
    return (
      <Screen className="center-screen">
        <Character kind={hero} size={150} mood="talk" />
        <p className="speech-bubble big">{t(intro)}</p>
        <button type="button" className="btn primary huge" onClick={() => setPhase('test')}>
          מַתְחִילִים ←
        </button>
      </Screen>
    )
  }

  if (phase === 'done') {
    return (
      <Screen className="center-screen">
        <Confetti />
        <Character kind={hero} size={150} mood="cheer" />
        <p className="speech-bubble big">{t(doneText)}</p>
        <button type="button" className="btn primary huge" onClick={() => nav('/map')}>
          לַמַּמְלָכָה 🏰
        </button>
      </Screen>
    )
  }

  return (
    <Screen>
      <TopBar
        back="/profiles"
        title={
          <div className="bar-progress" role="progressbar" aria-valuenow={state.total} aria-valuemax={placementMax()}>
            <span style={{ width: `${Math.min(100, (state.total / 14) * 100)}%` }} />
          </div>
        }
      />
      {exercise && <ExerciseView key={exercise.id} exercise={exercise} mode="placement" guide={hero} onDone={onDone} handwritingDefault={profile?.settings.handwriting ?? true} />}
    </Screen>
  )
}
