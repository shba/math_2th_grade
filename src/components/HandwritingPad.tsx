import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../app/AppContext'
import { g } from '../content/he/text'
import { addDigitSample, db } from '../data/db'
import { makeUserTemplate, recognizeDigit, type DigitResult } from '../handwriting/digits'
import type { Pt } from '../handwriting/pdollar'

export interface BoxValue {
  digit: number | null
  mirrored: boolean
  strokes: Pt[]
}

export const emptyBox = (): BoxValue => ({ digit: null, mirrored: false, strokes: [] })

const LOW_CONFIDENCE = 0.55
const RECOGNIZE_DELAY = 650

function DigitBox({
  value,
  onChange,
  onConfirmSample,
  label,
}: {
  value: BoxValue
  onChange: (v: BoxValue) => void
  onConfirmSample: (digit: number, strokes: Pt[]) => void
  label: string
}) {
  const { t, profileId } = useApp()
  const canvas = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Pt[]>(value.strokes)
  const strokeId = useRef(0)
  const drawing = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [confirm, setConfirm] = useState<DigitResult | null>(null)
  const samples = useLiveQuery(() => (profileId ? db.digitSamples.where('profileId').equals(profileId).toArray() : []), [profileId])
  const userTemplates = useMemo(() => (samples ?? []).map((s) => makeUserTemplate(s.digit, s.points)), [samples])

  const redraw = () => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const r = c.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    if (c.width !== Math.round(r.width * dpr)) {
      c.width = Math.round(r.width * dpr)
      c.height = Math.round(r.height * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, r.width, r.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#2e1065'
    ctx.lineWidth = Math.max(7, r.width * 0.09)
    let prev: Pt | null = null
    for (const p of strokes.current) {
      if (!prev || prev.id !== p.id) {
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x + 0.1, p.y + 0.1)
      } else ctx.lineTo(p.x, p.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      prev = p
    }
  }

  useEffect(() => {
    strokes.current = value.strokes
    redraw()
  }, [value.strokes])

  const recognize = () => {
    const r = recognizeDigit(strokes.current, userTemplates)
    if (!r) return
    if (r.confidence < LOW_CONFIDENCE) {
      setConfirm(r)
      onChange({ digit: null, mirrored: false, strokes: [...strokes.current] })
      return
    }
    onChange({ digit: r.digit, mirrored: r.mirrored, strokes: [...strokes.current] })
  }

  const pos = (e: React.PointerEvent): Pt => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, id: strokeId.current }
  }

  const clear = () => {
    strokes.current = []
    setConfirm(null)
    onChange(emptyBox())
    redraw()
  }

  return (
    <div className="digit-box-wrap">
      <div className={`digit-box ${value.digit !== null ? 'has' : ''}`}>
        <canvas
          ref={canvas}
          aria-label={label}
          role="img"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            drawing.current = true
            strokeId.current++
            clearTimeout(timer.current)
            setConfirm(null)
            strokes.current.push(pos(e))
            redraw()
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return
            strokes.current.push(pos(e))
            redraw()
          }}
          onPointerUp={() => {
            drawing.current = false
            clearTimeout(timer.current)
            timer.current = setTimeout(recognize, RECOGNIZE_DELAY)
          }}
          onPointerCancel={() => (drawing.current = false)}
        />
        {value.digit !== null && (
          <span className="recognized" aria-live="polite">
            {value.digit}
          </span>
        )}
      </div>
      <button type="button" className="erase" onClick={clear} aria-label="מחק ספרה">
        🧽
      </button>
      {confirm && (
        <div className="confirm" role="dialog" aria-label="אישור ספרה">
          <span>{t(g('הִתְכַּוַּנְתְּ לְ…', 'הִתְכַּוַּנְתָּ לְ…'))}</span>
          {[confirm.digit, ...confirm.alternatives.slice(0, 1)].map((d) => (
            <button
              key={d}
              type="button"
              className="confirm-btn"
              onClick={() => {
                setConfirm(null)
                onChange({ digit: d, mirrored: false, strokes: [...strokes.current] })
                onConfirmSample(d, [...strokes.current])
              }}
            >
              {d}
            </button>
          ))}
          <button type="button" className="confirm-btn small" onClick={clear} aria-label="לכתוב שוב">
            ↺
          </button>
        </div>
      )}
    </div>
  )
}

export function HandwritingPad({ boxes, onChange }: { boxes: BoxValue[]; onChange: (b: BoxValue[]) => void }) {
  const { profileId } = useApp()
  const names = boxes.length === 3 ? ['מאות', 'עשרות', 'יחידות'] : boxes.length === 2 ? ['עשרות', 'יחידות'] : ['ספרה']
  return (
    <div className="hand-pad" dir="ltr">
      {boxes.map((b, i) => (
        <DigitBox
          key={i}
          value={b}
          label={`כתיבת ${names[i] ?? 'ספרה'}`}
          onChange={(v) => onChange(boxes.map((x, j) => (j === i ? v : x)))}
          onConfirmSample={(d, pts) => profileId && void addDigitSample(profileId, d, pts)}
        />
      ))}
    </div>
  )
}
