import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { Avatar, Companion } from '../data/db'
import { onSpeakingChange } from '../speech/speech'

export type Mood = 'idle' | 'talk' | 'cheer' | 'think'
export type CharacterKind = Avatar | Companion

export const COMPANION_NAMES: Record<Companion, string> = {
  unicorn: 'קֶשֶׁת הַחַד־קֶרֶן',
  bunny: 'שׁוֹקִי הָאַרְנָב',
  fox: 'זְהָבִי הַשּׁוּעָל',
  kitten: 'מִיצִי הֶחֲתוּלָה',
}
export const HERO_NAMES: Record<Exclude<Avatar, 'animal'>, string> = {
  princess: 'הַנְּסִיכָה נוֹגָה',
  prince: 'הַנָּסִיךְ אוֹר',
}

function useSpeaking() {
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => {
    const off = onSpeakingChange(setSpeaking)
    return () => void off()
  }, [])
  return speaking
}

function useBlink(enabled: boolean) {
  const [closed, setClosed] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let t: ReturnType<typeof setTimeout>
    const loop = () => {
      t = setTimeout(() => {
        setClosed(true)
        setTimeout(() => setClosed(false), 140)
        loop()
      }, 2200 + Math.random() * 2500)
    }
    loop()
    return () => clearTimeout(t)
  }, [enabled])
  return closed
}

function Eyes({ y, dx = 14, closed, cx = 60, color = '#2e1065' }: { y: number; dx?: number; closed: boolean; cx?: number; color?: string }) {
  return (
    <g>
      {[cx - dx, cx + dx].map((x) =>
        closed ? (
          <path key={x} d={`M${x - 5} ${y} q5 3 10 0`} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : (
          <g key={x}>
            <ellipse cx={x} cy={y} rx="5.5" ry="7" fill={color} />
            <circle cx={x + 2} cy={y - 3} r="2.2" fill="#fff" />
          </g>
        ),
      )}
    </g>
  )
}

function Mouth({ x = 60, y, open, mood }: { x?: number; y: number; open: boolean; mood: Mood }) {
  if (open) return <ellipse cx={x} cy={y + 2} rx="6" ry="5" fill="#9f1239" />
  if (mood === 'cheer') return <path d={`M${x - 9} ${y} q9 11 18 0 z`} fill="#9f1239" />
  if (mood === 'think') return <path d={`M${x - 5} ${y + 2} h10`} stroke="#9f1239" strokeWidth="2.5" strokeLinecap="round" />
  return <path d={`M${x - 7} ${y} q7 7 14 0`} stroke="#9f1239" strokeWidth="2.5" fill="none" strokeLinecap="round" />
}

const Cheeks = ({ y, dx = 22, cx = 60 }: { y: number; dx?: number; cx?: number }) => (
  <g fill="#fb7185" opacity="0.45">
    <ellipse cx={cx - dx} cy={y} rx="6" ry="4" />
    <ellipse cx={cx + dx} cy={y} rx="6" ry="4" />
  </g>
)

function Crown({ y = 14, color = '#f59e0b' }: { y?: number; color?: string }) {
  return (
    <g>
      <path d={`M38 ${y + 16} L40 ${y} L50 ${y + 9} L60 ${y - 4} L70 ${y + 9} L80 ${y} L82 ${y + 16} Z`} fill={color} stroke="#b45309" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="60" cy={y + 9} r="3" fill="#db2777" />
      <circle cx="47" cy={y + 12} r="2" fill="#38bdf8" />
      <circle cx="73" cy={y + 12} r="2" fill="#38bdf8" />
    </g>
  )
}

function Hero({ kind, mood, talking, blink }: { kind: 'princess' | 'prince'; mood: Mood; talking: boolean; blink: boolean }) {
  const princess = kind === 'princess'
  return (
    <>
      {/* body */}
      <path d={princess ? 'M28 140 Q32 100 60 96 Q88 100 92 140 Z' : 'M32 140 Q34 102 60 98 Q86 102 88 140 Z'} fill={princess ? '#a855f7' : '#2563eb'} />
      <path d={princess ? 'M44 104 Q60 116 76 104' : 'M50 100 L60 114 L70 100'} stroke={princess ? '#f5d0fe' : '#fde68a'} strokeWidth="4" fill="none" />
      {princess && <path d="M30 70 Q24 40 44 28 Q60 18 78 28 Q98 42 90 74 Q96 98 82 100 L80 70 Z M30 70 Q24 98 38 100 L40 70 Z" fill="#7c2d12" />}
      {/* face */}
      <circle cx="60" cy="62" r="30" fill="#fcd9b8" />
      {/* hair */}
      {princess ? (
        <path d="M30 60 Q32 30 60 30 Q88 30 90 60 Q80 44 66 42 Q58 52 40 50 Q34 54 30 60 Z" fill="#92400e" />
      ) : (
        <path d="M30 58 Q30 30 60 30 Q90 30 90 58 Q84 44 74 46 Q66 38 56 44 Q42 40 30 58 Z" fill="#1f2937" />
      )}
      <Crown y={princess ? 14 : 16} />
      <Eyes y={64} closed={blink} />
      <Cheeks y={74} />
      <Mouth y={78} open={talking} mood={mood} />
    </>
  )
}

const PET_COLORS: Record<Companion, { body: string; accent: string; inner: string }> = {
  unicorn: { body: '#fdf4ff', accent: '#f472b6', inner: '#fbcfe8' },
  bunny: { body: '#f5f5f4', accent: '#a8a29e', inner: '#fda4af' },
  fox: { body: '#fb923c', accent: '#c2410c', inner: '#fff7ed' },
  kitten: { body: '#cbd5e1', accent: '#64748b', inner: '#fda4af' },
}

function Pet({ kind, mood, talking, blink }: { kind: Companion; mood: Mood; talking: boolean; blink: boolean }) {
  const c = PET_COLORS[kind]
  return (
    <>
      <ellipse cx="60" cy="118" rx="30" ry="22" fill={c.body} stroke={c.accent} strokeWidth="2" />
      {kind === 'bunny' && (
        <g stroke={c.accent} strokeWidth="2">
          <ellipse cx="45" cy="26" rx="9" ry="26" fill={c.body} />
          <ellipse cx="75" cy="26" rx="9" ry="26" fill={c.body} />
          <ellipse cx="45" cy="28" rx="4" ry="18" fill={c.inner} stroke="none" />
          <ellipse cx="75" cy="28" rx="4" ry="18" fill={c.inner} stroke="none" />
        </g>
      )}
      {(kind === 'fox' || kind === 'kitten') && (
        <g fill={c.body} stroke={c.accent} strokeWidth="2" strokeLinejoin="round">
          <path d="M30 56 L34 18 L56 40 Z" />
          <path d="M90 56 L86 18 L64 40 Z" />
          <path d="M36 46 L37 28 L48 40 Z" fill={c.inner} stroke="none" />
          <path d="M84 46 L83 28 L72 40 Z" fill={c.inner} stroke="none" />
        </g>
      )}
      {kind === 'unicorn' && (
        <g>
          <path d="M54 30 L60 2 L66 30 Z" fill="#fcd34d" stroke="#d97706" strokeWidth="1.5" />
          <path d="M56 22 L64 18 M55 14 L63 12" stroke="#d97706" strokeWidth="1.5" />
          <path d="M34 44 L36 26 L50 36 Z M86 44 L84 26 L70 36 Z" fill={c.body} stroke={c.accent} strokeWidth="2" />
          <path d="M80 34 Q100 50 92 84 Q88 66 82 60 Q94 70 90 96 Q80 74 76 62 Z" fill="#c084fc" />
          <path d="M44 34 Q56 24 72 30 Q64 38 50 40 Z" fill="#f472b6" />
        </g>
      )}
      <circle cx="60" cy="66" r="32" fill={c.body} stroke={c.accent} strokeWidth="2" />
      {kind === 'fox' && <path d="M36 74 Q60 104 84 74 Q72 70 60 80 Q48 70 36 74 Z" fill={c.inner} />}
      <Eyes y={62} closed={blink} />
      <ellipse cx="60" cy="74" rx="4.5" ry="3.2" fill={kind === 'fox' ? '#1f2937' : '#f472b6'} />
      <Cheeks y={74} dx={20} />
      {kind === 'kitten' && (
        <g stroke={c.accent} strokeWidth="1.5" strokeLinecap="round">
          <path d="M30 74 h-12 M30 79 l-11 4 M90 74 h12 M90 79 l11 4" />
        </g>
      )}
      <Mouth y={82} open={talking} mood={mood} />
    </>
  )
}

export function Character({ kind, mood = 'idle', size = 120, label, talkWithSpeech = true }: { kind: CharacterKind; mood?: Mood; size?: number; label?: string; talkWithSpeech?: boolean }) {
  const reduce = useReducedMotion()
  const speaking = useSpeaking()
  const talking = (mood === 'talk' || (talkWithSpeech && speaking)) && !reduce
  const [mouthOpen, setMouthOpen] = useState(false)
  const blink = useBlink(!reduce)

  useEffect(() => {
    if (!talking) {
      setMouthOpen(false)
      return
    }
    const t = setInterval(() => setMouthOpen((o) => !o), 170)
    return () => clearInterval(t)
  }, [talking])

  const anim = reduce
    ? {}
    : mood === 'cheer'
      ? { y: [0, -18, 0, -10, 0], rotate: [0, -6, 6, 0] }
      : mood === 'think'
        ? { rotate: [0, -5, 0] }
        : { y: [0, -4, 0] }
  const transition = mood === 'cheer' ? { duration: 0.9 } : { duration: mood === 'think' ? 2 : 2.6, repeat: Infinity, ease: 'easeInOut' as const }

  return (
    <motion.svg
      viewBox="0 0 120 142"
      className="character"
      width={size}
      height={(size * 142) / 120}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      animate={anim}
      transition={transition}
      style={{ overflow: 'visible', flexShrink: 0 }}
    >
      {kind === 'princess' || kind === 'prince' ? (
        <Hero kind={kind} mood={mood} talking={mouthOpen} blink={blink} />
      ) : kind === 'animal' ? (
        <Pet kind="unicorn" mood={mood} talking={mouthOpen} blink={blink} />
      ) : (
        <Pet kind={kind} mood={mood} talking={mouthOpen} blink={blink} />
      )}
    </motion.svg>
  )
}
