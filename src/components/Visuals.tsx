import { motion } from 'framer-motion'
import type { SolidId, Visual } from '../exercises/types'

const INK = '#2e1065'

function Items({ v }: { v: Extract<Visual, { kind: 'items' }> }) {
  const slots = v.slots ?? (v.pairs ? v.count : Math.max(v.count, Math.ceil(v.count / 5) * 5))
  if (v.pairs) {
    const cols = Math.ceil(v.count / 2)
    return (
      <div className="vis-pairs" role="img" aria-label={`${v.count} פריטים בזוגות`}>
        {Array.from({ length: cols }, (_, c) => (
          <div key={c} className={`pair ${c * 2 + 1 >= v.count ? 'single' : ''}`}>
            <span>{v.icon}</span>
            {c * 2 + 1 < v.count && <span>{v.icon}</span>}
          </div>
        ))}
      </div>
    )
  }
  const rows = Math.ceil(slots / 10)
  const firstAdded = v.count - (v.added ?? 0)
  return (
    <div className="vis-frames" role="img" aria-label={`${v.count} פריטים${v.crossed ? `, ${v.crossed} מחוקים` : ''}`} dir="ltr">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="frame-row">
          {Array.from({ length: Math.min(10, slots - r * 10) }, (_, c) => {
            const i = r * 10 + c
            const filled = i < v.count
            const crossed = filled && v.crossed !== undefined && i >= v.count - v.crossed
            const added = filled && v.added !== undefined && i >= firstAdded
            return (
              <span key={c} className={`cell ${c === 4 ? 'gap' : ''} ${added ? 'added' : ''} ${crossed ? 'crossed' : ''}`}>
                {filled ? v.icon : ''}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Blocks({ v }: { v: Extract<Visual, { kind: 'blocks' }> }) {
  return (
    <div className="vis-blocks" dir="ltr" role="img" aria-label={`${v.hundreds} מאות, ${v.tens} עשרות, ${v.ones} יחידות`}>
      {v.hundreds > 0 && (
        <div className="bgroup">
          {Array.from({ length: v.hundreds }, (_, i) => (
            <svg key={i} viewBox="0 0 50 50" width="54" height="54" aria-hidden>
              <rect x="0" y="0" width="50" height="50" fill="#fbbf24" stroke="#92400e" />
              {Array.from({ length: 9 }, (_, k) => (
                <g key={k} stroke="#92400e" strokeWidth="0.5">
                  <line x1={(k + 1) * 5} y1="0" x2={(k + 1) * 5} y2="50" />
                  <line y1={(k + 1) * 5} x1="0" y2={(k + 1) * 5} x2="50" />
                </g>
              ))}
            </svg>
          ))}
        </div>
      )}
      <div className="bgroup">
        {Array.from({ length: v.tens }, (_, i) => (
          <svg key={i} viewBox="0 0 10 100" width="13" height="110" aria-hidden>
            <rect x="0" y="0" width="10" height="100" fill="#60a5fa" stroke="#1e3a8a" />
            {Array.from({ length: 9 }, (_, k) => (
              <line key={k} x1="0" x2="10" y1={(k + 1) * 10} y2={(k + 1) * 10} stroke="#1e3a8a" strokeWidth="0.6" />
            ))}
          </svg>
        ))}
      </div>
      <div className="bgroup ones">
        {Array.from({ length: v.ones }, (_, i) => (
          <svg key={i} viewBox="0 0 10 10" width="13" height="13" aria-hidden>
            <rect x="0" y="0" width="10" height="10" fill="#f472b6" stroke="#831843" />
          </svg>
        ))}
      </div>
    </div>
  )
}

function Column({ v }: { v: Extract<Visual, { kind: 'column' }> }) {
  const width = Math.max(String(v.a).length, String(v.b).length, 2)
  const cells = (x: number) => String(x).padStart(width, ' ').split('')
  return (
    <div className="vis-column" dir="ltr" role="img" aria-label={`${v.a} ${v.op} ${v.b} במאונך`}>
      <div className="crow">
        <span className="cop" />
        {cells(v.a).map((c, i) => (
          <span key={i} className="cd">{c}</span>
        ))}
      </div>
      <div className="crow">
        <span className="cop">{v.op === '-' ? '−' : '+'}</span>
        {cells(v.b).map((c, i) => (
          <span key={i} className="cd">{c}</span>
        ))}
      </div>
      <div className="cline" />
      <div className="crow">
        <span className="cop" />
        {Array.from({ length: width }, (_, i) => (
          <span key={i} className="cd q">?</span>
        ))}
      </div>
      <div className="clabels" aria-hidden>
        <span className="cop" />
        {width === 3 && <span className="cd small">מ</span>}
        <span className="cd small">ע</span>
        <span className="cd small">י</span>
      </div>
    </div>
  )
}

function Groups({ v }: { v: Extract<Visual, { kind: 'groups' }> }) {
  return (
    <div className="vis-groups" role="img" aria-label={`${v.groups} קבוצות של ${v.each}`}>
      {Array.from({ length: v.groups }, (_, g) => (
        <div key={g} className="group">
          {Array.from({ length: v.each }, (_, i) => (
            <span key={i}>{v.icon}</span>
          ))}
        </div>
      ))}
    </div>
  )
}

function NumberLine({ v }: { v: Extract<Visual, { kind: 'numberline' }> }) {
  const W = 340
  const pad = 20
  const x = (n: number) => pad + ((n - v.min) / (v.max - v.min)) * (W - 2 * pad)
  const ticks: number[] = []
  for (let n = v.min; n <= v.max; n += v.step) ticks.push(n)
  return (
    <svg viewBox={`0 0 ${W} 90`} className="vis-svg" role="img" aria-label="ישר המספרים">
      <line x1={pad - 8} x2={W - pad + 8} y1="60" y2="60" stroke={INK} strokeWidth="2.5" markerEnd="url(#arr)" />
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill={INK} />
        </marker>
      </defs>
      {ticks.map((n) => {
        const big = n % v.labelEvery === 0
        return (
          <g key={n}>
            <line x1={x(n)} x2={x(n)} y1={big ? 50 : 54} y2={big ? 70 : 66} stroke={INK} strokeWidth={big ? 2.5 : 1.5} />
            {big && (
              <text x={x(n)} y="88" textAnchor="middle" fontSize="15" fill={INK} fontWeight="600">
                {n}
              </text>
            )}
          </g>
        )
      })}
      {v.jumps?.slice(1).map((n, i) => {
        const from = v.jumps![i]
        return <path key={n} d={`M${x(from)} 50 Q${(x(from) + x(n)) / 2} 18 ${x(n)} 50`} fill="none" stroke="#db2777" strokeWidth="2.5" />
      })}
      {v.arrowAt !== undefined && (
        <motion.path
          d={`M${x(v.arrowAt)} 46 l-9 -16 h18 z`}
          fill="#db2777"
          initial={{ y: -8 }}
          animate={{ y: 0 }}
          transition={{ repeat: 3, repeatType: 'reverse', duration: 0.4 }}
        />
      )}
    </svg>
  )
}

function Fraction({ v, size = 110 }: { v: Extract<Visual, { kind: 'fraction' }>; size?: number }) {
  const fill = '#a855f7'
  if (v.shape === 'rect') {
    return (
      <svg viewBox="0 0 120 70" width={size * 1.2} height={size * 0.7} aria-hidden className="vis-fraction">
        {Array.from({ length: v.parts }, (_, i) => (
          <rect key={i} x={10 + (i * 100) / v.parts} y="10" width={100 / v.parts} height="50" fill={i < v.shaded ? fill : '#fff'} stroke={INK} strokeWidth="2" />
        ))}
      </svg>
    )
  }
  const r = 45
  const slice = (i: number) => {
    if (v.parts === 1) return <circle key={i} cx="50" cy="50" r={r} fill={v.shaded ? fill : '#fff'} stroke={INK} strokeWidth="2" />
    const a0 = (i / v.parts) * 2 * Math.PI - Math.PI / 2
    const a1 = ((i + 1) / v.parts) * 2 * Math.PI - Math.PI / 2
    const large = a1 - a0 > Math.PI ? 1 : 0
    return (
      <path
        key={i}
        d={`M50 50 L${50 + r * Math.cos(a0)} ${50 + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${50 + r * Math.cos(a1)} ${50 + r * Math.sin(a1)} Z`}
        fill={i < v.shaded ? fill : '#fff'}
        stroke={INK}
        strokeWidth="2"
      />
    )
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className="vis-fraction">
      {Array.from({ length: v.parts }, (_, i) => slice(i))}
    </svg>
  )
}

function Clock({ v }: { v: Extract<Visual, { kind: 'clock' }> }) {
  const hAngle = ((v.h % 12) + v.m / 60) * 30
  const mAngle = v.m * 6
  return (
    <svg viewBox="0 0 200 200" className="vis-svg clock" role="img" aria-label={`שעון, ${v.h}:${String(v.m).padStart(2, '0')}`}>
      <circle cx="100" cy="100" r="92" fill="#fff" stroke={INK} strokeWidth="6" />
      {Array.from({ length: 60 }, (_, i) => (
        <line key={i} x1="100" y1="12" x2="100" y2={i % 5 ? 18 : 24} stroke={INK} strokeWidth={i % 5 ? 1.5 : 3.5} transform={`rotate(${i * 6} 100 100)`} />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) * 30 * Math.PI) / 180
        return (
          <text key={i} x={100 + 66 * Math.sin(a)} y={100 - 66 * Math.cos(a) + 8} textAnchor="middle" fontSize="22" fontWeight="700" fill={INK}>
            {i + 1}
          </text>
        )
      })}
      <line x1="100" y1="100" x2="100" y2="52" stroke="#db2777" strokeWidth="9" strokeLinecap="round" transform={`rotate(${hAngle} 100 100)`} />
      <line x1="100" y1="100" x2="100" y2="24" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" transform={`rotate(${mAngle} 100 100)`} />
      <circle cx="100" cy="100" r="7" fill={INK} />
    </svg>
  )
}

function Bars({ v }: { v: Extract<Visual, { kind: 'bars' }> }) {
  const max = 10
  const H = 200
  const unit = (H - 30) / max
  const bw = 46
  const left = 34
  return (
    <svg viewBox={`0 0 ${left + v.values.length * (bw + 22) + 10} ${H + 44}`} className="vis-svg bars" role="img" aria-label="דיאגרמת עמודות">
      {Array.from({ length: max + 1 }, (_, i) => (
        <g key={i}>
          <line x1={left} x2="1000" y1={H - i * unit} y2={H - i * unit} stroke="#e9d5ff" strokeWidth="1" />
          <text x={left - 8} y={H - i * unit + 5} textAnchor="end" fontSize="13" fill={INK}>
            {i}
          </text>
        </g>
      ))}
      <line x1={left} x2={left} y1={H} y2={H - max * unit} stroke={INK} strokeWidth="2" />
      <line x1={left} x2="1000" y1={H} y2={H} stroke={INK} strokeWidth="2" />
      {v.values.map((val, i) => {
        const x = left + 14 + i * (bw + 22)
        return (
          <g key={i}>
            <motion.rect
              x={x}
              width={bw}
              fill={['#a855f7', '#f472b6', '#38bdf8', '#34d399'][i % 4]}
              stroke={INK}
              initial={{ y: H, height: 0 }}
              animate={{ y: H - val * unit, height: val * unit }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            />
            <text x={x + bw / 2} y={H + 34} textAnchor="middle" fontSize="28">
              {v.icons[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Grid({ v }: { v: Extract<Visual, { kind: 'grid' }> }) {
  const c = 34
  const W = (v.w + 2) * c
  const H = (v.h + 2) * c
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="vis-svg grid" role="img" aria-label={`מלבן ${v.w} על ${v.h}`}>
      {Array.from({ length: v.w + 3 }, (_, i) => (
        <line key={`v${i}`} x1={i * c} x2={i * c} y1="0" y2={H} stroke="#e9d5ff" />
      ))}
      {Array.from({ length: v.h + 3 }, (_, i) => (
        <line key={`h${i}`} y1={i * c} y2={i * c} x1="0" x2={W} stroke="#e9d5ff" />
      ))}
      {Array.from({ length: v.w * v.h }, (_, i) => (
        <rect key={i} x={c + (i % v.w) * c} y={c + Math.floor(i / v.w) * c} width={c} height={c} fill="#bbf7d0" stroke="#166534" strokeWidth="1.5" />
      ))}
      <rect x={c} y={c} width={v.w * c} height={v.h * c} fill="none" stroke={INK} strokeWidth="4" />
    </svg>
  )
}

function Ruler({ v }: { v: Extract<Visual, { kind: 'ruler' }> }) {
  const cm = 22
  const len = 15
  const pad = 16
  return (
    <svg viewBox={`0 0 ${len * cm + pad * 2} 110`} className="vis-svg" role="img" aria-label="סרגל">
      <rect x={pad} y="8" width={v.length * cm} height="30" rx="8" fill="#fde68a" stroke="#92400e" strokeWidth="2" />
      <text x={pad + (v.length * cm) / 2} y="32" textAnchor="middle" fontSize="20">
        {v.icon}
      </text>
      <line x1={pad} x2={pad} y1="0" y2="56" stroke="#db2777" strokeDasharray="3 3" />
      <line x1={pad + v.length * cm} x2={pad + v.length * cm} y1="0" y2="56" stroke="#db2777" strokeDasharray="3 3" />
      <rect x={pad - 6} y="54" width={len * cm + 12} height="50" rx="4" fill="#f0f9ff" stroke="#0c4a6e" strokeWidth="2" />
      {Array.from({ length: len * 2 + 1 }, (_, i) => (
        <line key={i} x1={pad + (i * cm) / 2} x2={pad + (i * cm) / 2} y1="54" y2={i % 2 ? 62 : 70} stroke="#0c4a6e" strokeWidth={i % 2 ? 1 : 2} />
      ))}
      {Array.from({ length: len + 1 }, (_, i) => (
        <text key={i} x={pad + i * cm} y="90" textAnchor="middle" fontSize="13" fill="#0c4a6e">
          {i}
        </text>
      ))}
    </svg>
  )
}

export function Solid({ solid, size = 150 }: { solid: SolidId; size?: number }) {
  const s = { fill: '#c4b5fd', stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const }
  const light = { ...s, fill: '#ddd6fe' }
  const dark = { ...s, fill: '#a78bfa' }
  const hidden = { stroke: INK, strokeWidth: 1.5, strokeDasharray: '4 4', fill: 'none' }
  const shapes: Record<SolidId, React.ReactNode> = {
    cube: (
      <>
        <path d="M30 50 L70 50 L70 90 L30 90 Z" {...s} />
        <path d="M30 50 L50 30 L90 30 L70 50 Z" {...light} />
        <path d="M70 50 L90 30 L90 70 L70 90 Z" {...dark} />
      </>
    ),
    box: (
      <>
        <path d="M14 56 L74 56 L74 90 L14 90 Z" {...s} />
        <path d="M14 56 L32 38 L92 38 L74 56 Z" {...light} />
        <path d="M74 56 L92 38 L92 72 L74 90 Z" {...dark} />
      </>
    ),
    cylinder: (
      <>
        <path d="M25 30 L25 80 A25 9 0 0 0 75 80 L75 30" {...s} />
        <ellipse cx="50" cy="30" rx="25" ry="9" {...light} />
      </>
    ),
    pyramid: (
      <>
        <path d="M50 12 L20 78 L62 90 Z" {...s} />
        <path d="M50 12 L62 90 L84 70 Z" {...dark} />
        <path d="M20 78 L42 62 L84 70" {...hidden} />
        <path d="M50 12 L42 62" {...hidden} />
      </>
    ),
    cone: (
      <>
        <path d="M50 12 L24 80 A26 9 0 0 0 76 80 Z" {...s} />
        <path d="M24 80 A26 9 0 0 1 76 80" {...hidden} />
      </>
    ),
    sphere: (
      <>
        <circle cx="50" cy="52" r="36" {...s} />
        <ellipse cx="50" cy="52" rx="36" ry="11" {...hidden} />
        <ellipse cx="38" cy="38" rx="9" ry="6" fill="#fff" opacity="0.7" />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className="vis-solid">
      {shapes[solid]}
    </svg>
  )
}

export function Shape({ v, size = 110 }: { v: Extract<Visual, { kind: 'shape' }>; size?: number }) {
  return (
    <svg viewBox="-10 -10 120 120" width={size} height={size} aria-hidden>
      <polygon points={v.points.map((p) => p.join(',')).join(' ')} fill={v.color ?? '#a855f7'} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {v.axis === 'v' && <line x1="108" x2="108" y1="-8" y2="108" stroke="#0ea5e9" strokeWidth="4" strokeDasharray="6 5" />}
    </svg>
  )
}

function Prices({ v }: { v: Extract<Visual, { kind: 'prices' }> }) {
  return (
    <div className="vis-prices">
      {v.items.map((it) => (
        <div key={it.name} className="price-card">
          <span className="pi" aria-hidden>
            {it.icon}
          </span>
          <span className="pn">{it.name}</span>
          <span className="pp">
            <bdi dir="ltr">{it.price}</bdi> שְׁקָלִים
          </span>
        </div>
      ))}
    </div>
  )
}

function Chain({ v }: { v: Extract<Visual, { kind: 'chain' }> }) {
  return (
    <div className="vis-chain" dir="ltr" role="img" aria-label={`שרשרת: ${v.op}${v.step}`}>
      {v.values.map((val, i) => (
        <div key={i} className="chain-step">
          {i > 0 && (
            <span className="chain-arrow">
              <small>
                {v.op === '-' ? '−' : '+'}
                {v.step}
              </small>
              →
            </span>
          )}
          <span className={`chain-box ${val === null ? 'q' : ''}`}>{val ?? '?'}</span>
        </div>
      ))}
    </div>
  )
}

function Balance({ v }: { v: Extract<Visual, { kind: 'balance' }> }) {
  const tilt = v.heavier === 'left' ? -12 : 12
  return (
    <svg viewBox="0 0 240 150" className="vis-svg" role="img" aria-label="מאזניים">
      <path d="M120 140 L105 150 H135 Z M118 40 V140 H122 V40 Z" fill={INK} />
      <motion.g initial={{ rotate: 0 }} animate={{ rotate: tilt }} transition={{ duration: 0.8 }} style={{ originX: '120px', originY: '40px' }}>
        <rect x="30" y="37" width="180" height="6" rx="3" fill={INK} />
        <path d="M40 43 L22 80 H78 L60 43" fill="none" stroke={INK} strokeWidth="1.5" />
        <path d="M200 43 L182 80 H238 L220 43" fill="none" stroke={INK} strokeWidth="1.5" />
        <ellipse cx="50" cy="82" rx="30" ry="6" fill="#fcd34d" stroke={INK} />
        <ellipse cx="210" cy="82" rx="30" ry="6" fill="#fcd34d" stroke={INK} />
        <text x="50" y="74" textAnchor="middle" fontSize="34">
          {v.left}
        </text>
        <text x="210" y="74" textAnchor="middle" fontSize="34">
          {v.right}
        </text>
      </motion.g>
    </svg>
  )
}

export function VisualView({ v }: { v: Visual }) {
  switch (v.kind) {
    case 'items':
      return <Items v={v} />
    case 'blocks':
      return <Blocks v={v} />
    case 'column':
      return <Column v={v} />
    case 'groups':
      return <Groups v={v} />
    case 'numberline':
      return <NumberLine v={v} />
    case 'fraction':
      return <Fraction v={v} />
    case 'clock':
      return <Clock v={v} />
    case 'bars':
      return <Bars v={v} />
    case 'grid':
      return <Grid v={v} />
    case 'ruler':
      return <Ruler v={v} />
    case 'solid':
      return <Solid solid={v.solid} />
    case 'shape':
      return <Shape v={v} />
    case 'prices':
      return <Prices v={v} />
    case 'chain':
      return <Chain v={v} />
    case 'balance':
      return <Balance v={v} />
  }
}

export function ChoiceVisual({ v }: { v: Visual }) {
  if (v.kind === 'fraction') return <Fraction v={v} size={84} />
  if (v.kind === 'shape') return <Shape v={v} size={84} />
  if (v.kind === 'solid') return <Solid solid={v.solid} size={84} />
  return <VisualView v={v} />
}
