import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Scales its content down (never up) to fit the space the flex layout gives it, so a screen
 * never scrolls however large a visual is. The parent must give this box a bounded height.
 */
export function FitBox({ children, className = '', maxScale = 1 }: { children: ReactNode; className?: string; maxScale?: number }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i || typeof ResizeObserver === 'undefined') return
    const fit = () => {
      const w = Math.max(i.offsetWidth, i.scrollWidth)
      const h = Math.max(i.offsetHeight, i.scrollHeight)
      if (!w || !h) return
      setScale(Math.min(maxScale, o.clientWidth / w, o.clientHeight / h))
    }
    const ro = new ResizeObserver(fit)
    ro.observe(o)
    ro.observe(i)
    fit()
    return () => ro.disconnect()
  }, [maxScale])

  return (
    <div ref={outer} className={`fit-box ${className}`}>
      <div ref={inner} className="fit-inner" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}
