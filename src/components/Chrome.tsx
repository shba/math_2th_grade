import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BadgeDef } from '../curriculum/topics'

export function TopBar({ title, back, right }: { title?: ReactNode; back?: string; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="topbar">
      <button type="button" className="icon-btn" onClick={() => nav(back ?? '/map')} aria-label={back ? 'חזרה' : 'למפת הממלכה'}>
        <span aria-hidden>{back ? '→' : '🏰'}</span>
      </button>
      <div className="topbar-title">{title}</div>
      <div className="topbar-end">{right}</div>
    </header>
  )
}

export function Screen({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.main className={`screen ${className}`} style={style} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      {children}
    </motion.main>
  )
}

export function BadgeIcon({ badge, earned = true, size = 72 }: { badge: BadgeDef; earned?: boolean; size?: number }) {
  return (
    <div className={`badge ${earned ? 'earned' : 'locked'}`} style={{ width: size, height: size, fontSize: size * 0.5 }} aria-label={earned ? badge.name : 'תג נעול'} role="img">
      <span aria-hidden>{earned ? badge.emoji : '❔'}</span>
    </div>
  )
}

export function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => i)
  const colors = ['#f472b6', '#a855f7', '#facc15', '#38bdf8', '#34d399']
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((i) => (
        <motion.span
          key={i}
          style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length] }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: 420 + (i % 5) * 40, opacity: 0, rotate: 360 }}
          transition={{ duration: 1.6 + (i % 4) * 0.3, delay: (i % 7) * 0.05 }}
        />
      ))}
    </div>
  )
}

export function ProgressDots({ total, done }: { total: number; done: number }) {
  return (
    <div className="progress-dots" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < done ? 'on' : ''} />
      ))}
    </div>
  )
}
