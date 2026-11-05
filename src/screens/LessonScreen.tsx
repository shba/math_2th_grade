import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useGuide } from '../app/useGuide'
import { Character } from '../components/Characters'
import { FitBox } from '../components/FitBox'
import { ProgressDots, Screen, TopBar } from '../components/Chrome'
import { SpeakButton } from '../components/SpeakButton'
import { VisualView } from '../components/Visuals'
import { g } from '../content/he/text'
import { topicById } from '../curriculum/topics'
import { getProgress, saveProgress } from '../data/repo'
import type { Token, TopicId } from '../exercises/types'
import { LESSONS } from '../lessons/lessons'
import { speak, stop } from '../speech/speech'

function Tokens({ tokens, filled }: { tokens: Token[]; filled?: number }) {
  return (
    <bdi dir="ltr" className="equation small">
      {tokens.map((t, i) =>
        t.t === 'n' ? (
          <span key={i} className="num">{t.v}</span>
        ) : t.t === 'w' ? (
          <span key={i} className="word">{t.v}</span>
        ) : t.t === 'blank' ? (
          <span key={i} className={`blank ${filled !== undefined ? 'filled revealed' : ''}`}>{filled ?? '?'}</span>
        ) : (
          <span key={i} className="op">{t.v === '-' ? '−' : t.v}</span>
        ),
      )}
    </bdi>
  )
}

const RIGHT = g('נָכוֹן! כׇּל הַכָּבוֹד!', 'נָכוֹן! כׇּל הַכָּבוֹד!')
const AGAIN = g('כִּמְעַט! סִפְרִי שׁוּב אֶת הַתַּפּוּחִים.', 'כִּמְעַט! סְפֹר שׁוּב אֶת הַתַּפּוּחִים.')

export function LessonScreen() {
  const { topicId } = useParams<{ topicId: TopicId }>()
  const nav = useNavigate()
  const { t, profileId } = useApp()
  const { hero, pet } = useGuide()
  const topic = topicById(topicId!)
  const slides = LESSONS[topic.id]
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const slide = slides[i]
  const text = t(slide.text)
  const solved = !!slide.ask && picked === slide.ask.answer

  useEffect(() => {
    void speak(text)
    return () => stop()
  }, [text])

  const go = (k: number) => {
    setPicked(null)
    setI(k)
  }

  const pick = (c: number) => {
    setPicked(c)
    void speak(t(c === slide.ask!.answer ? RIGHT : AGAIN))
  }

  const finish = async () => {
    if (profileId) {
      const p = await getProgress(profileId, topic.id)
      await saveProgress(profileId, { ...p, lessonSeen: true })
    }
    nav(`/practice/${topic.id}`, { replace: true })
  }

  const speakerIsHero = slide.speaker === 'hero' || hero === pet
  return (
    <Screen className="lesson fit" style={{ ['--land' as string]: topic.land.color, ['--land-soft' as string]: topic.land.soft }}>
      <TopBar back={`/topic/${topic.id}`} title={<ProgressDots total={slides.length} done={i + 1} />} />
      <div className="lesson-stage">
        <div className="lesson-cast">
          <motion.div animate={{ scale: speakerIsHero ? 1.08 : 0.9, opacity: speakerIsHero ? 1 : 0.75 }}>
            <Character kind={hero} size={112} mood={speakerIsHero ? (solved ? 'cheer' : 'talk') : 'idle'} talkWithSpeech={speakerIsHero} />
          </motion.div>
          {hero !== pet && (
            <motion.div animate={{ scale: !speakerIsHero ? 1.08 : 0.9, opacity: !speakerIsHero ? 1 : 0.75 }}>
              <Character kind={pet} size={96} mood={!speakerIsHero ? (solved ? 'cheer' : 'talk') : 'idle'} talkWithSpeech={!speakerIsHero} />
            </motion.div>
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={i} className="lesson-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="speech-row">
              <p className="speech-bubble">{text}</p>
              <SpeakButton text={text} />
            </div>
            {slide.visual && (
              <FitBox className="visual-card lesson-visual">
                <VisualView v={slide.visual} />
              </FitBox>
            )}
            {slide.tokens && (
              <div className="equation-wrap">
                <Tokens tokens={slide.tokens} filled={solved ? slide.ask!.answer : undefined} />
              </div>
            )}
            {slide.ask && (
              <div className="lesson-ask">
                <div className="choices n3" role="group" aria-label="בחירת תשובה">
                  {slide.ask.choices.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`choice ${picked === c ? (c === slide.ask!.answer ? 'correct' : 'picked wrong') : ''}`}
                      disabled={solved}
                      onClick={() => pick(c)}
                    >
                      <span className="choice-label">{c}</span>
                    </button>
                  ))}
                </div>
                {picked !== null && (
                  <p className="lesson-feedback" role="status">
                    {solved ? '🌟 ' : '💡 '}
                    {t(solved ? RIGHT : AGAIN)}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="actions row">
        {i > 0 && (
          <button type="button" className="btn ghost big" onClick={() => go(i - 1)}>
            → אָחוֹרָה
          </button>
        )}
        {i < slides.length - 1 ? (
          <button type="button" className={`btn big ${slide.ask && !solved ? 'ghost' : 'primary'}`} onClick={() => go(i + 1)}>
            הַלְאָה ←
          </button>
        ) : (
          <button type="button" className="btn primary big" onClick={finish}>
            מְתַרְגְּלִים! ✏️
          </button>
        )}
      </div>
    </Screen>
  )
}
