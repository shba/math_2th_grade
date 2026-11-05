import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../app/AppContext'
import { g } from '../content/he/text'
import { numberChoices } from '../exercises/helpers'
import { generateExercise } from '../exercises/registry'
import { createRng } from '../exercises/rng'
import { speakQuestion, tokensForSpeech } from '../speech/speech'
import { SpeakButton } from '../components/SpeakButton'
import { useGameRecorder } from './useGameRecorder'

const STEPS = 10

export function RaceGame({ onEnd }: { onEnd: (score: number, total: number, extra?: string) => void }) {
  const { t } = useApp()
  const rec = useGameRecorder('race', 'add-sub-20')
  const rng = useRef(createRng())
  const [timed, setTimed] = useState<boolean | null>(null)
  const [pos, setPos] = useState(0)
  const [q, setQ] = useState(0)
  const [best, setBest] = useState<number | undefined>()
  const [elapsed, setElapsed] = useState(0)
  const [shake, setShake] = useState<number | null>(null)
  const start = useRef(0)
  const firstTry = useRef(true)

  useEffect(() => void rec.getBest().then(setBest), []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!timed) return
    start.current = Date.now()
    const i = setInterval(() => setElapsed((Date.now() - start.current) / 1000), 200)
    return () => clearInterval(i)
  }, [timed])

  const ex = useMemo(() => generateExercise('add-sub-20', 2, 1 + (q % 3), rng.current, { skillId: q % 2 ? 'sub20' : 'add20' }), [q])
  const opts = useMemo(() => {
    const all = numberChoices(ex.answers[0], rng.current)
    const others = all.filter((c) => c.value !== ex.answers[0]).slice(0, 2)
    return rng.current.shuffle([...others, all.find((c) => c.value === ex.answers[0])!])
  }, [ex])

  useEffect(() => {
    if (timed === null) return
    firstTry.current = true
    void speakQuestion(tokensForSpeech(ex.tokens!))
  }, [ex, timed])

  if (timed === null) {
    return (
      <div className="game race-intro">
        <p className="speech-bubble big">{t(g('מֵרוֹץ הַכִּרְכָּרָה! כׇּל תְּשׁוּבָה נְכוֹנָה מְקַדֶּמֶת אֶת הַכִּרְכָּרָה. רוֹצָה לְהִתְחָרוֹת נֶגֶד הַשִּׂיא שֶׁלָּךְ?', 'מֵרוֹץ הַכִּרְכָּרָה! כׇּל תְּשׁוּבָה נְכוֹנָה מְקַדֶּמֶת אֶת הַכִּרְכָּרָה. רוֹצֶה לְהִתְחָרוֹת נֶגֶד הַשִּׂיא שֶׁלְּךָ?'))}</p>
        <div className="row">
          <button type="button" className="btn primary big" onClick={() => setTimed(true)}>⏱️ עִם שָׁעוֹן</button>
          <button type="button" className="btn ghost big" onClick={() => setTimed(false)}>🐢 בְּלִי שָׁעוֹן</button>
        </div>
        {best !== undefined && <p className="muted">🏆 הַשִּׂיא: <bdi dir="ltr">{best.toFixed(1)}</bdi> שְׁנִיּוֹת</p>}
      </div>
    )
  }

  const answer = async (v: number) => {
    if (v !== ex.answers[0]) {
      firstTry.current = false
      setShake(v)
      setTimeout(() => setShake(null), 500)
      return
    }
    rec.record(firstTry.current, 2, ex.skillId)
    const p = pos + 1
    setPos(p)
    if (p >= STEPS) {
      const secs = (Date.now() - start.current) / 1000
      if (timed) {
        const r = await rec.saveBest(secs, true)
        onEnd(STEPS, STEPS, r?.isNew ? `🏆 שִׂיא חָדָשׁ! ${secs.toFixed(1)} שְׁנִיּוֹת` : `${secs.toFixed(1)} שְׁנִיּוֹת (הַשִּׂיא: ${r?.best.toFixed(1)})`)
      } else onEnd(STEPS, STEPS)
      return
    }
    setQ(q + 1)
  }

  const ghost = timed && best ? Math.min(1, elapsed / best) : null
  return (
    <div className="game race">
      <div className="track" dir="ltr" aria-label={`התקדמות ${pos} מתוך ${STEPS}`}>
        {ghost !== null && (
          <span className="carriage ghost" style={{ left: `calc(${ghost * 88}%)` }} aria-hidden>
            🐴
          </span>
        )}
        <motion.span className="carriage" animate={{ left: `${(pos / STEPS) * 88}%` }} aria-hidden>
          🐴
        </motion.span>
        <span className="finish" aria-hidden>🏁</span>
      </div>
      {timed && <p className="timer" aria-live="off"><bdi dir="ltr">{elapsed.toFixed(1)}</bdi> ⏱️</p>}
      <div className="equation-wrap question-row">
        <SpeakButton text={tokensForSpeech(ex.tokens!)} />
        <bdi dir="ltr" className="equation">
          {ex.tokens!.map((tk, i) => (tk.t === 'n' ? <span key={i} className="num">{tk.v}</span> : tk.t === 'blank' ? <span key={i} className="blank">?</span> : tk.t === 'op' ? <span key={i} className="op">{tk.v === '-' ? '−' : tk.v}</span> : null))}
        </bdi>
      </div>
      <div className="choices">
        {opts.map((c) => (
          <motion.button key={c.value} type="button" className="choice" onClick={() => void answer(c.value)} animate={shake === c.value ? { x: [0, -8, 8, 0] } : {}}>
            <span className="choice-label">{c.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
