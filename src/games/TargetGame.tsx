import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../app/AppContext'
import { g } from '../content/he/text'
import { createRng } from '../exercises/rng'
import type { TopicId } from '../exercises/types'
import { speak, speakQuestion } from '../speech/speech'
import { SpeakButton } from '../components/SpeakButton'
import { useGameRecorder } from './useGameRecorder'

const ROUNDS = 6

interface Round {
  start: number
  op: '+' | '-'
  lo: number
  hi: number
  cards: number[]
  max: number
}

function makeRound(rng: ReturnType<typeof createRng>, big: boolean, i: number): Round {
  if (big) {
    const start = rng.int(2, 5) * 10 + rng.int(0, 9)
    const lo = start + rng.int(2, 4) * 10
    const cards = rng.shuffle([5, 10, 15, 20, 25, 30, 35, 40, 45]).slice(0, 6)
    if (!cards.some((c) => start + c >= lo && start + c <= lo + 9)) cards[0] = lo - start + rng.int(0, 9)
    return { start, op: '+', lo, hi: lo + 9, cards: rng.shuffle(cards), max: 100 }
  }
  if (i === 0) return { start: 5, op: '+', lo: 12, hi: 15, cards: rng.shuffle([2, 4, 7, 8, 9, 11, 12, 3]).slice(0, 6).concat(rng.pick([7, 8, 9, 10])), max: 20 }
  const sub = rng.next() < 0.4
  if (sub) {
    const start = rng.int(15, 20)
    const lo = rng.int(4, 8)
    const cards = rng.shuffle([1, 2, 3, 5, 6, 8, 9, 10, 12, 14]).slice(0, 6)
    const good = start - lo - rng.int(0, 3)
    if (!cards.includes(good)) cards[0] = good
    return { start, op: '-', lo, hi: lo + 3, cards: rng.shuffle(cards), max: 20 }
  }
  const start = rng.int(2, 9)
  const lo = rng.int(11, 15)
  const cards = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).slice(0, 6)
  const good = lo - start + rng.int(0, 3)
  if (!cards.includes(good)) cards[0] = good
  return { start, op: '+', lo, hi: lo + 3, cards: rng.shuffle(cards), max: 20 }
}

export function TargetGame({ topicId, onEnd }: { topicId: TopicId; onEnd: (score: number, total: number) => void }) {
  const { t } = useApp()
  const big = topicId === 'add-sub-100'
  const rec = useGameRecorder('target', topicId)
  const rng = useRef(createRng())
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const firstTry = useRef(true)
  const r = useMemo(() => makeRound(rng.current, big, i), [big, i])
  const question = t(g(`צָרִיךְ לְקַבֵּל מִסְפָּר בֵּין ${r.lo} לְ־${r.hi}. בַּחֲרִי כַּרְטִיס.`, `צָרִיךְ לְקַבֵּל מִסְפָּר בֵּין ${r.lo} לְ־${r.hi}. בְּחַר כַּרְטִיס.`))

  useEffect(() => {
    firstTry.current = true
    setPicked(null)
    void speakQuestion(question)
  }, [question])

  const result = picked === null ? null : r.op === '+' ? r.start + picked : r.start - picked
  const hit = result !== null && result >= r.lo && result <= r.hi
  const W = 320
  const x = (v: number) => 10 + (Math.max(0, Math.min(r.max, v)) / r.max) * (W - 20)

  const pick = (c: number) => {
    setPicked(c)
    const res = r.op === '+' ? r.start + c : r.start - c
    const ok = res >= r.lo && res <= r.hi
    if (ok) {
      rec.record(firstTry.current, 1, 'target')
      if (firstTry.current) setScore((s) => s + 1)
      void speak(`${res}! בּוּל בַּמַּטָּרָה!`)
    } else {
      firstTry.current = false
      void speak(res < r.lo ? `${res}. קָרוֹב! צָרִיךְ קְצָת יוֹתֵר.` : `${res}. קָרוֹב! צָרִיךְ קְצָת פָּחוֹת.`)
    }
  }

  return (
    <div className="game target">
      <div className="game-round">{i + 1} / {ROUNDS}</div>
      <div className="question-row">
        <SpeakButton text={question} />
        <p className="instruction">{t(g('בַּחֲרִי כַּרְטִיס כְּדֵי לִפְגֹּעַ בַּמַּטָּרָה', 'בְּחַר כַּרְטִיס כְּדֵי לִפְגֹּעַ בַּמַּטָּרָה'))}</p>
      </div>
      <div className="equation-wrap">
        <bdi dir="ltr" className="equation">
          <span className="num">{r.start}</span>
          <span className="op">{r.op === '-' ? '−' : '+'}</span>
          <span className={`blank ${picked !== null ? 'filled' : ''}`}>{picked ?? '?'}</span>
          <span className="op">=</span>
          <span className="num">{result ?? '?'}</span>
        </bdi>
      </div>
      <p className="target-range" aria-live="polite">
        {result === null ? (
          <>🎯 <bdi dir="ltr">{r.lo}–{r.hi}</bdi></>
        ) : hit ? (
          'בּוּל בַּמַּטָּרָה! 🎯'
        ) : result < r.lo ? (
          'קָרוֹב! צָרִיךְ קְצָת יוֹתֵר.'
        ) : (
          'קָרוֹב! צָרִיךְ קְצָת פָּחוֹת.'
        )}
      </p>
      <svg viewBox={`0 0 ${W} 80`} className="vis-svg" role="img" aria-label={`מטרה בין ${r.lo} ל־${r.hi}`}>
        <rect x={x(r.lo)} y="20" width={x(r.hi) - x(r.lo)} height="30" rx="6" fill="#fbcfe8" stroke="#db2777" strokeWidth="2" />
        <text x={(x(r.lo) + x(r.hi)) / 2} y="16" textAnchor="middle" fontSize="16">🎯</text>
        <line x1="10" x2={W - 10} y1="50" y2="50" stroke="#2e1065" strokeWidth="2" />
        {Array.from({ length: r.max / (big ? 10 : 1) + 1 }, (_, k) => {
          const v = k * (big ? 10 : 1)
          return (
            <g key={k}>
              <line x1={x(v)} x2={x(v)} y1="45" y2="55" stroke="#2e1065" />
              {(big || v % 5 === 0) && <text x={x(v)} y="72" textAnchor="middle" fontSize="12" fill="#2e1065">{v}</text>}
            </g>
          )
        })}
        {result !== null && (
          <motion.text initial={{ x: x(r.start), y: 40 }} animate={{ x: x(result), y: 44 }} transition={{ duration: 0.7 }} textAnchor="middle" fontSize="22">
            {hit ? '💥' : '➹'}
          </motion.text>
        )}
      </svg>
      <div className="cards">
        {r.cards.map((c, k) => (
          <button key={k} type="button" className={`card ${picked === c ? 'picked' : ''}`} disabled={hit} onClick={() => pick(c)}>
            {c}
          </button>
        ))}
      </div>
      {hit && (
        <div className="actions">
          <button type="button" className="btn primary big" onClick={() => (i + 1 >= ROUNDS ? onEnd(score, ROUNDS) : setI(i + 1))}>
            מַמְשִׁיכִים ←
          </button>
        </div>
      )}
    </div>
  )
}
