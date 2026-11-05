import type { Pt } from '../preprocess'

type Stroke = [number, number][]

/** Arc around (cx, cy); angles in degrees, y pointing down (270° is the top). */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 20): Stroke {
  const out: Stroke = []
  for (let i = 0; i <= steps; i++) {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
  }
  return out
}

/** One continuous stroke crossing in the middle, the way many children write 8. */
function figureEight(steps = 48): Stroke {
  const out: Stroke = []
  for (let i = 0; i <= steps; i++) {
    const t = (2 * Math.PI * i) / steps
    out.push([50 + 56 * Math.sin(t) * Math.cos(t), 70 - 60 * Math.cos(t)])
  }
  return out
}

const line = (...pts: [number, number][]): Stroke => pts

/** Common ways children write each digit, in a 100 × 140 box. */
export const DIGIT_STYLES: Record<number, Stroke[][]> = {
  0: [[arc(50, 70, 34, 58, 270, 630)], [arc(50, 70, 28, 60, 250, 615)], [arc(52, 70, 38, 56, 280, 640)]],
  1: [
    [line([50, 10], [50, 130])],
    [line([28, 38], [52, 10], [52, 130])],
    [line([30, 36], [52, 10], [52, 130]), line([28, 130], [76, 130])],
    [line([60, 10], [42, 130])],
  ],
  2: [
    [[...arc(50, 45, 32, 32, 200, 380), [20, 130], [86, 130]]],
    [[...arc(50, 42, 30, 30, 190, 360), [52, 82], [18, 130], [88, 128]]],
    [[...arc(48, 40, 30, 28, 210, 400), [24, 122], ...arc(30, 120, 10, 10, 300, 90, 8), [88, 128]]],
  ],
  3: [
    [[...arc(46, 40, 30, 28, 200, 450), ...arc(46, 98, 34, 32, 270, 510)]],
    [[[20, 12], [78, 12], [44, 58], ...arc(46, 94, 34, 34, 280, 510)]],
    [arc(48, 40, 28, 28, 200, 450), arc(48, 98, 32, 32, 270, 500)],
  ],
  4: [
    [line([62, 10], [14, 92], [88, 92]), line([64, 44], [64, 132])],
    [line([24, 10], [20, 82], [88, 82]), line([66, 12], [66, 132])],
    [line([66, 132], [66, 10], [14, 90], [88, 90])],
  ],
  5: [
    [[[78, 10], [28, 10], [24, 62], ...arc(48, 94, 34, 34, 235, 520)]],
    [line([28, 12], [24, 62]), line([28, 12], [80, 12]), arc(48, 94, 34, 34, 235, 520)],
    [[[26, 12], [24, 64], ...arc(48, 94, 34, 34, 235, 520)], line([26, 12], [78, 14])],
  ],
  6: [
    [[[72, 10], [50, 26], [32, 52], [22, 92], ...arc(50, 102, 28, 28, 180, 540)]],
    [[...arc(60, 70, 40, 60, 285, 180, 10), ...arc(50, 102, 28, 28, 180, 540)]],
    [[[64, 10], [30, 80], ...arc(50, 104, 26, 26, 200, 560)]],
  ],
  7: [
    [line([14, 12], [86, 12], [40, 132])],
    [line([14, 12], [86, 12], [44, 132]), line([34, 70], [76, 70])],
    [[[14, 14], [86, 12], [70, 50], [56, 90], [50, 132]]],
  ],
  8: [
    [arc(50, 38, 25, 26, 0, 360), arc(50, 98, 32, 32, 0, 360)],
    [[...arc(50, 38, 25, 26, 90, 450), ...arc(50, 98, 32, 32, 270, 630)]],
    [figureEight()],
  ],
  9: [
    [[...arc(46, 40, 28, 28, 0, 360), [74, 40], [70, 132]]],
    [[...arc(46, 42, 28, 28, 340, 700), [72, 70], [62, 132]]],
    [arc(48, 40, 26, 28, 0, 360), line([74, 34], [74, 132])],
  ],
}

/** Digits whose mirror image is not (close to) the digit itself. */
export const MIRRORABLE = [2, 3, 4, 5, 6, 7, 9]

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function resample(stroke: Stroke, spacing: number): Stroke {
  const out: Stroke = [stroke[0]]
  let carry = 0
  for (let i = 1; i < stroke.length; i++) {
    const [x0, y0] = stroke[i - 1]
    const [x1, y1] = stroke[i]
    const d = Math.hypot(x1 - x0, y1 - y0)
    let pos = spacing - carry
    while (pos <= d) {
      const t = pos / d
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t])
      pos += spacing
    }
    carry = d - (pos - spacing)
  }
  out.push(stroke[stroke.length - 1])
  return out
}

export interface SampleOptions {
  /** 0 = clean template, 1 = typical child-like variation. */
  jitter?: number
  mirror?: boolean
}

/**
 * A pen-stroke sample in canvas pixels (box about 150 × 190), the way the digit box records
 * it: random slant, shear, aspect, size, position, wobble and sampling density.
 */
export function strokeSample(digit: number, style: number, seed: number, { jitter = 1, mirror = false }: SampleOptions = {}): Pt[] {
  const r = rng(seed * 7919 + digit * 131 + style * 17)
  const j = (a: number) => (r() * 2 - 1) * a * jitter
  const strokes = DIGIT_STYLES[digit][style % DIGIT_STYLES[digit].length]
  const rot = (j(10) * Math.PI) / 180
  const shear = j(0.22)
  const sx = 1 + j(0.2)
  const sy = 1 + j(0.12)
  const size = 1.1 + j(0.25)
  const offX = 20 + j(10)
  const offY = 12 + j(8)
  const wobA = 2.5 * jitter * r()
  const wobF = 0.05 + r() * 0.05
  const wobP = r() * 6
  const spacing = 2 + r() * 5
  const pts: Pt[] = []
  strokes.forEach((s, id) => {
    const moved = s.map(([x, y]): [number, number] => {
      let X = mirror ? 100 - x : x
      let Y = y
      X -= 50
      Y -= 70
      X = (X + shear * Y) * sx
      Y *= sy
      const rx = X * Math.cos(rot) - Y * Math.sin(rot)
      const ry = X * Math.sin(rot) + Y * Math.cos(rot)
      return [(rx + 50) * size * 0.8 + offX, (ry + 70) * size * 0.8 + offY]
    })
    resample(moved, spacing).forEach(([x, y], k) => {
      pts.push({ x: x + wobA * Math.sin(k * wobF * 6 + wobP + id), y: y + wobA * Math.cos(k * wobF * 5 + wobP * 1.3 + id), id })
    })
  })
  return pts
}

export const styleCount = (digit: number) => DIGIT_STYLES[digit].length
