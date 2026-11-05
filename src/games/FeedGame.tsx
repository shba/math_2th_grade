import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../app/AppContext'
import { g } from '../content/he/text'
import { getProgress } from '../data/repo'
import { currentLevel } from '../engine/adaptive'
import { numberChoices } from '../exercises/helpers'
import { generateExercise } from '../exercises/registry'
import { createRng } from '../exercises/rng'
import type { Exercise, TopicId } from '../exercises/types'
import { speak, speakQuestion, tokensForSpeech } from '../speech/speech'
import { SpeakButton } from '../components/SpeakButton'
import { useGameRecorder } from './useGameRecorder'

const ANIMALS = ['🐰', '🐻', '🦊', '🐼', '🐨', '🐷', '🐹', '🦄']
const ROUNDS = 8

function pickExercise(topicId: TopicId, level: number, rng: ReturnType<typeof createRng>): Exercise {
  for (let i = 0; i < 30; i++) {
    const ex = generateExercise(topicId, level, 1 + (i % 3), rng)
    const blanks = ex.tokens?.filter((t) => t.t === 'blank').length ?? 0
    if (ex.answerType === 'number' && ex.tokens && blanks === 1 && !ex.validate && !ex.visual) return ex
  }
  return generateExercise('add-sub-20', 2, 2, rng)
}

export function FeedGame({ topicId, onEnd }: { topicId: TopicId; onEnd: (score: number, total: number) => void }) {
  const { profileId, t } = useApp()
  const rng = useRef(createRng())
  const rec = useGameRecorder('feed', topicId)
  const [level, setLevel] = useState(1)
  const [round, setRound] = useState(0)
  const [fed, setFed] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const firstTry = useRef(true)

  useEffect(() => {
    if (profileId) void getProgress(profileId, topicId).then((p) => setLevel(currentLevel(p)))
  }, [profileId, topicId])

  const ex = useMemo(() => pickExercise(topicId, level, rng.current), [topicId, level, round])
  const apples = useMemo(() => numberChoices(ex.answers[0], rng.current), [ex])
  const animal = ANIMALS[round % ANIMALS.length]

  const question = useMemo(() => ['אֵיזֶה תַּפּוּחַ לָתֵת לַחַיָּה?', tokensForSpeech(ex.tokens!)], [ex])

  useEffect(() => {
    firstTry.current = true
    void speakQuestion(question)
  }, [question])

  const give = (v: number) => {
    if (fed !== null) return
    if (v === ex.answers[0]) {
      setFed(v)
      rec.record(firstTry.current, level, ex.skillId)
      const s = score + (firstTry.current ? 1 : 0)
      setScore(s)
      void speak('יַאמִּי! תּוֹדָה!')
      setTimeout(() => {
        setFed(null)
        if (round + 1 >= ROUNDS) onEnd(s, ROUNDS)
        else setRound(round + 1)
      }, 1300)
    } else {
      firstTry.current = false
      setWrong(v)
      void speak(t(g('לֹא זֶה. נַסִּי תַּפּוּחַ אַחֵר!', 'לֹא זֶה. נַסֵּה תַּפּוּחַ אַחֵר!')))
      setTimeout(() => setWrong(null), 600)
    }
  }

  return (
    <div className="game feed">
      <div className="game-round" aria-label={`סיבוב ${round + 1} מתוך ${ROUNDS}`}>
        {Array.from({ length: ROUNDS }, (_, i) => (
          <span key={i} aria-hidden>{i < round ? '💖' : '🤍'}</span>
        ))}
      </div>
      <div className="feed-animal">
        <motion.span className="animal" aria-hidden animate={fed !== null ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] } : { y: [0, -6, 0] }} transition={fed !== null ? { duration: 0.6 } : { repeat: Infinity, duration: 2 }}>
          {animal}
        </motion.span>
        <SpeakButton text={question} />
        <div className="feed-bubble">
          <bdi dir="ltr" className="equation small">
            {ex.tokens!.map((tk, i) => (tk.t === 'n' ? <span key={i} className="num">{tk.v}</span> : tk.t === 'blank' ? <span key={i} className="blank">?</span> : tk.t === 'w' ? <span key={i} className="word">{tk.v}</span> : <span key={i} className="op">{tk.v === '-' ? '−' : tk.v}</span>))}
          </bdi>
        </div>
        <AnimatePresence>{fed !== null && <motion.span className="hearts" initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -40 }} exit={{ opacity: 0 }} aria-hidden>💕</motion.span>}</AnimatePresence>
      </div>
      <div className="apples">
        {apples.map((a) => (
          <motion.button
            key={a.value}
            type="button"
            className="apple"
            onClick={() => give(a.value)}
            animate={fed === a.value ? { y: -160, scale: 0.3, opacity: 0 } : wrong === a.value ? { x: [0, -8, 8, -4, 0] } : { y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: fed === a.value ? 0.6 : 0.4 }}
            aria-label={`תפוח ${a.value}`}
          >
            <span aria-hidden>🍎</span>
            <b>{a.value}</b>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
