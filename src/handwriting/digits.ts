import { aspect, greedyCloudMatch, normalize, type Pt } from './pdollar'

type Stroke = [number, number][]

/** Arc around (cx, cy); angles in degrees with y pointing down (270° is the top). */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 16): Stroke {
  const out: Stroke = []
  for (let i = 0; i <= steps; i++) {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
  }
  return out
}

const line = (...pts: [number, number][]): Stroke => pts

// Digits drawn in a 100 × 140 box, several common ways each.
const BASE: Record<number, Stroke[][]> = {
  0: [[arc(50, 70, 34, 58, 270, 630, 24)], [arc(50, 70, 28, 60, 250, 610, 24)]],
  1: [[line([50, 10], [50, 130])], [line([28, 38], [52, 10], [52, 130])], [line([30, 36], [52, 10], [52, 130]), line([28, 130], [76, 130])]],
  2: [
    [[...arc(50, 45, 32, 32, 200, 380), [20, 130], [86, 130]]],
    [[...arc(50, 42, 30, 30, 190, 360), [52, 82], [18, 130], [88, 128]]],
  ],
  3: [
    [[...arc(46, 40, 30, 28, 200, 450), ...arc(46, 98, 34, 32, 270, 510)]],
    [[[20, 12], [78, 12], [44, 58], ...arc(46, 94, 34, 34, 280, 510)]],
  ],
  4: [
    [line([62, 10], [14, 92], [88, 92]), line([64, 44], [64, 132])],
    [line([24, 10], [20, 82], [88, 82]), line([66, 12], [66, 132])],
  ],
  5: [
    [[[78, 10], [28, 10], [24, 62], ...arc(48, 94, 34, 34, 235, 520)]],
    [line([28, 12], [24, 62]), line([28, 12], [80, 12]), arc(48, 94, 34, 34, 235, 520)],
  ],
  6: [
    [[[72, 10], [50, 26], [32, 52], [22, 92], ...arc(50, 102, 28, 28, 180, 540)]],
    [[...arc(60, 70, 40, 60, 285, 180, 10), ...arc(50, 102, 28, 28, 180, 540)]],
  ],
  7: [[line([14, 12], [86, 12], [40, 132])], [line([14, 12], [86, 12], [44, 132]), line([34, 70], [76, 70])]],
  8: [
    [arc(50, 38, 25, 26, 0, 360), arc(50, 98, 32, 32, 0, 360)],
    [[...arc(50, 38, 25, 26, 90, 450), ...arc(50, 98, 32, 32, 270, 630)]],
  ],
  9: [
    [[...arc(46, 40, 28, 28, 0, 360), [74, 40], [70, 132]]],
    [[...arc(46, 42, 28, 28, 340, 700), [72, 70], [62, 132]]],
  ],
}

const MIRRORABLE = new Set([1, 2, 3, 4, 5, 6, 7, 9])

export interface Template {
  digit: number
  mirrored: boolean
  points: Pt[]
  user?: boolean
}

const toPts = (strokes: Stroke[], mirror = false): Pt[] =>
  strokes.flatMap((s, id) => s.map(([x, y]) => ({ x: mirror ? 100 - x : x, y, id })))

function buildTemplates(): Template[] {
  const out: Template[] = []
  for (const [d, variants] of Object.entries(BASE)) {
    const digit = Number(d)
    for (const v of variants) {
      out.push({ digit, mirrored: false, points: normalize(toPts(v)) })
      // A plain vertical "1" is its own mirror image.
      if (MIRRORABLE.has(digit) && !(digit === 1 && v.length === 1 && v[0].length === 2)) {
        out.push({ digit, mirrored: true, points: normalize(toPts(v, true)) })
      }
    }
  }
  return out
}

export const BUILTIN_TEMPLATES = buildTemplates()

export const rawTemplateStrokes = (digit: number, variant = 0, mirror = false): Pt[] => toPts(BASE[digit][variant], mirror)

export interface DigitResult {
  digit: number
  mirrored: boolean
  distance: number
  /** 0…1; below ~0.6 the UI asks the child to confirm. */
  confidence: number
  alternatives: number[]
}

export function recognizeDigit(strokes: Pt[], userTemplates: Template[] = []): DigitResult | null {
  if (strokes.length < 2) return null
  // A tall, thin drawing is a "1"; point clouds of a short line match anything.
  if (aspect(strokes) > 4) return { digit: 1, mirrored: false, distance: 0, confidence: 1, alternatives: [7] }
  const pts = normalize(strokes)
  const all = [...BUILTIN_TEMPLATES, ...userTemplates]
  const scored = all.map((t) => ({ t, d: greedyCloudMatch(pts, t.points) })).sort((a, b) => a.d - b.d)
  let best = scored[0]
  const bestPlain = scored.find((s) => !s.t.mirrored)!
  // Only call a digit mirrored when it is clearly closer to a mirrored template.
  if (best.t.mirrored && bestPlain.d - best.d < 0.12 * best.d) best = bestPlain
  const perDigit: number[] = []
  for (const s of scored) if (!perDigit.includes(s.t.digit)) perDigit.push(s.t.digit)
  const secondDigit = scored.find((s) => s.t.digit !== best.t.digit)
  const margin = secondDigit ? (secondDigit.d - best.d) / secondDigit.d : 1
  const absolute = Math.max(0, 1 - best.d / 3)
  const confidence = Math.min(1, absolute * 0.5 + Math.min(1, margin * 2.5) * 0.5)
  return {
    digit: best.t.digit,
    mirrored: best.t.mirrored,
    distance: best.d,
    confidence,
    alternatives: perDigit.filter((d) => d !== best.t.digit).slice(0, 2),
  }
}

export function makeUserTemplate(digit: number, strokes: Pt[]): Template {
  return { digit, mirrored: false, points: normalize(strokes), user: true }
}
