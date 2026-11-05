import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../app/AppContext'
import { g } from '../content/he/text'
import { getProgress } from '../data/repo'
import { createRng } from '../exercises/rng'
import { speak } from '../speech/speech'
import { useGameRecorder } from './useGameRecorder'

const ROUNDS = 5

function Castle({ h, t, o, done }: { h: number; t: number; o: number; done: boolean }) {
  return (
    <div className="castle" dir="ltr" aria-hidden>
      {Array.from({ length: h }, (_, i) => (
        <motion.div key={`h${i}`} className="palace" initial={{ scale: 0 }} animate={{ scale: 1 }}>
          🏰
        </motion.div>
      ))}
      {Array.from({ length: t }, (_, i) => (
        <motion.div key={`t${i}`} className="tower" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          {done && i === 0 && <span className="flag">🚩</span>}
        </motion.div>
      ))}
      <div className="bricks">
        {Array.from({ length: o }, (_, i) => (
          <motion.span key={`o${i}`} className="brick" initial={{ scale: 0 }} animate={{ scale: 1 }} />
        ))}
      </div>
    </div>
  )
}

export function CastleGame({ onEnd }: { onEnd: (score: number, total: number) => void }) {
  const { profileId, t } = useApp()
  const rec = useGameRecorder('castle', 'numbers-1000')
  const rng = useRef(createRng())
  const [big, setBig] = useState(false)
  const [round, setRound] = useState(0)
  const [target, setTarget] = useState(0)
  const [parts, setParts] = useState({ h: 0, t: 0, o: 0 })
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)
  const [score, setScore] = useState(0)
  const firstTry = useRef(true)

  useEffect(() => {
    if (profileId) void getProgress(profileId, 'numbers-1000').then((p) => setBig(p.passedLevels >= 2))
  }, [profileId])

  useEffect(() => {
    const n = big ? rng.current.int(101, 499) : rng.current.int(12, 89)
    setTarget(n)
    setParts({ h: 0, t: 0, o: 0 })
    setDone(false)
    setMsg('')
    firstTry.current = true
    void speak(t(g(`בְּנִי טִירָה שֶׁל ${n}`, `בְּנֵה טִירָה שֶׁל ${n}`)))
  }, [round, big, t])

  const value = parts.h * 100 + parts.t * 10 + parts.o
  const tt = { h: Math.floor(target / 100), t: Math.floor(target / 10) % 10, o: target % 10 }

  const check = () => {
    if (value === target) {
      setDone(true)
      rec.record(firstTry.current, big ? 3 : 1, 'castle')
      const s = score + (firstTry.current ? 1 : 0)
      setScore(s)
      const m = 'הַטִּירָה מוּכָנָה! הַדֶּגֶל עוֹלֶה!'
      setMsg(m)
      void speak(m)
      return
    }
    firstTry.current = false
    let m: string
    if (parts.h !== tt.h) m = `יֵשׁ ${parts.h} אַרְמוֹנוֹת שֶׁל מֵאָה. צָרִיךְ ${tt.h}.`
    else if (parts.t !== tt.t) m = `יֵשׁ ${parts.t} מִגְדָּלִים שֶׁל עֲשָׂרָה. צָרִיךְ ${tt.t}.`
    else m = `יֵשׁ ${parts.o} לְבֵנִים. צָרִיךְ ${tt.o}.`
    setMsg(m)
    void speak(m)
  }

  const add = (k: 'h' | 't' | 'o', d: number) => setParts((p) => ({ ...p, [k]: Math.max(0, Math.min(9, p[k] + d)) }))

  return (
    <div className="game castle-game">
      <div className="game-round">{round + 1} / {ROUNDS}</div>
      <p className="target-number">
        <bdi dir="ltr">{target}</bdi>
      </p>
      <Castle {...parts} done={done} />
      <div className="pv-table" dir="ltr" aria-live="polite">
        {big && <span><small>מֵאוֹת</small>{parts.h}</span>}
        <span><small>עֲשָׂרוֹת</small>{parts.t}</span>
        <span><small>יְחִידוֹת</small>{parts.o}</span>
      </div>
      {!done && (
        <div className="castle-controls">
          {big && (
            <div className="ctl">
              <button type="button" className="btn ghost" onClick={() => add('h', 1)}>＋ <span className="mini palace-mini" aria-hidden /> 100</button>
              <button type="button" className="btn ghost" onClick={() => add('h', -1)} aria-label="הורדת מאה">－</button>
            </div>
          )}
          <div className="ctl">
            <button type="button" className="btn ghost" onClick={() => add('t', 1)}>＋ <span className="mini tower-mini" aria-hidden /> 10</button>
            <button type="button" className="btn ghost" onClick={() => add('t', -1)} aria-label="הורדת עשרה">－</button>
          </div>
          <div className="ctl">
            <button type="button" className="btn ghost" onClick={() => add('o', 1)}>＋ <span className="mini brick-mini" aria-hidden /> 1</button>
            <button type="button" className="btn ghost" onClick={() => add('o', -1)} aria-label="הורדת אחד">－</button>
          </div>
        </div>
      )}
      {msg && <p className="bubble try" aria-live="polite">{msg}</p>}
      <div className="actions">
        {!done ? (
          <button type="button" className="btn primary big" onClick={check}>✔ בְּדִיקָה</button>
        ) : (
          <button type="button" className="btn primary big" onClick={() => (round + 1 >= ROUNDS ? onEnd(score, ROUNDS) : setRound(round + 1))}>
            מַמְשִׁיכִים ←
          </button>
        )}
      </div>
    </div>
  )
}
