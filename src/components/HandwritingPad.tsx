import { useEffect, useRef, useState } from 'react'
import { useApp } from '../app/AppContext'
import { g } from '../content/he/text'
import { addDigitSample } from '../data/db'
import { loadClassifier } from '../handwriting/classifier'
import type { Pt } from '../handwriting/preprocess'
import { recognizeDigit, type DigitResult } from '../handwriting/recognize'

export interface BoxValue {
  digit: number | null
  mirrored: boolean
  strokes: Pt[]
}

export const emptyBox = (): BoxValue => ({ digit: null, mirrored: false, strokes: [] })

export const LOW_CONFIDENCE = 0.55
export const RECOGNIZE_DELAY = 600

/** Starts loading the model as soon as the pad appears; reports whether loading failed. */
function useModelFailed() {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    loadClassifier().catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])
  return failed
}

function DigitBox({
  value,
  onChange,
  onConfirmSample,
  label,
  disabled,
}: {
  value: BoxValue
  onChange: (v: BoxValue) => void
  onConfirmSample: (digit: number, strokes: Pt[]) => void
  label: string
  disabled?: boolean
}) {
  const { t } = useApp()
  const canvas = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Pt[]>(value.strokes)
  const strokeId = useRef(0)
  const drawing = useRef(false)
  const generation = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [confirm, setConfirm] = useState<DigitResult | null>(null)
  const [pending, setPending] = useState(false)
  const [hasInk, setHasInk] = useState(value.strokes.length > 0)

  const redraw = () => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
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
    ctx.lineWidth = Math.max(8, r.width * 0.1)
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

  useEffect(() => () => clearTimeout(timer.current), [])

  const recognize = async () => {
    if (!strokes.current.length) return
    const gen = ++generation.current
    const pts = [...strokes.current]
    setPending(true)
    let r: DigitResult | null = null
    try {
      r = await recognizeDigit(pts, await loadClassifier())
    } catch {
      r = null
    }
    if (gen !== generation.current) return
    setPending(false)
    if (!r) return
    if (r.confidence < LOW_CONFIDENCE) {
      setConfirm(r)
      onChange({ digit: null, mirrored: false, strokes: pts })
      return
    }
    onChange({ digit: r.digit, mirrored: r.mirrored, strokes: pts })
  }

  const pos = (e: React.PointerEvent): Pt => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, id: strokeId.current }
  }

  const clear = () => {
    generation.current++
    clearTimeout(timer.current)
    strokes.current = []
    setConfirm(null)
    setPending(false)
    setHasInk(false)
    onChange(emptyBox())
    redraw()
  }

  return (
    <div className="digit-box-wrap">
      <div className={`digit-box ${value.digit !== null ? 'has' : ''} ${pending ? 'pending' : ''}`}>
        <canvas
          ref={canvas}
          aria-label={label}
          role="img"
          onPointerDown={(e) => {
            if (disabled) return
            e.currentTarget.setPointerCapture?.(e.pointerId)
            drawing.current = true
            generation.current++
            strokeId.current++
            clearTimeout(timer.current)
            setConfirm(null)
            setHasInk(true)
            strokes.current.push(pos(e))
            redraw()
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return
            strokes.current.push(pos(e))
            redraw()
          }}
          onPointerUp={() => {
            if (!drawing.current) return
            drawing.current = false
            clearTimeout(timer.current)
            timer.current = setTimeout(() => void recognize(), RECOGNIZE_DELAY)
          }}
          onPointerCancel={() => (drawing.current = false)}
        />
        {value.digit !== null && (
          <span className="recognized" aria-live="polite" data-digit={value.digit}>
            {value.digit}
          </span>
        )}
      </div>
      <button type="button" className="erase" onClick={clear} disabled={disabled || !hasInk} aria-label="מחק ספרה">
        🧽
      </button>
      {confirm && (
        <div className="confirm" role="dialog" aria-label="אישור ספרה">
          <span>{t(g('הִתְכַּוַּנְתְּ לְ…', 'הִתְכַּוַּנְתָּ לְ…'))}</span>
          {[confirm.digit, ...confirm.alternatives.slice(0, 2)].map((d) => (
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

/** Digit boxes are written and read left to right, as numbers are, also inside the RTL page. */
export function HandwritingPad({
  boxes,
  onBoxChange,
  onAdd,
  disabled,
}: {
  boxes: BoxValue[]
  /** Called per box, possibly after other boxes changed (recognition is asynchronous). */
  onBoxChange: (index: number, value: BoxValue) => void
  onAdd?: () => void
  disabled?: boolean
}) {
  const { t, profileId } = useApp()
  const failed = useModelFailed()
  return (
    <div className={`hand-pad n${boxes.length}`} dir="ltr">
      {boxes.map((b, i) => (
        <DigitBox
          key={i}
          value={b}
          label={`כתיבת ספרה ${i + 1} משמאל`}
          disabled={disabled}
          onChange={(v) => onBoxChange(i, v)}
          onConfirmSample={(d, pts) => profileId && void addDigitSample(profileId, d, pts)}
        />
      ))}
      {onAdd && (
        <button type="button" className="add-digit" disabled={disabled} onClick={onAdd} aria-label="הוספת ספרה">
          +
        </button>
      )}
      {failed && (
        <p className="pad-error" dir="rtl" role="alert">
          {t(g('אֶפְשָׁר לִכְתֹּב עִם הַמִּקְלֶדֶת 🔢', 'אֶפְשָׁר לִכְתֹּב עִם הַמִּקְלֶדֶת 🔢'))}
        </p>
      )}
    </div>
  )
}
