/** A sampled pen position; points with the same id belong to one stroke. */
export interface Pt {
  x: number
  y: number
  id: number
}

export const GRID = 28
/** MNIST fits the ink of each digit into a 20 × 20 box inside the 28 × 28 frame. */
export const BOX = 20
/**
 * Pen width (in 28-px grid units) used when strokes are re-rendered for the classifier.
 * Re-rendering from the sampled points makes the input independent of how thick the
 * child's line looked on screen. Calibrated so rendered digits have about the same ink
 * mass as normalized MNIST/EMNIST digits (see scripts/handwriting/train-digits.ts).
 */
export const PEN_WIDTH = 2.6
/** Width of the anti-aliased edge, in grid pixels; MNIST strokes have soft edges. */
const EDGE = 1.2

type Seg = [number, number, number, number]

function segments(points: Pt[]): Seg[] {
  const segs: Seg[] = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[i + 1]
    const startsStroke = i === 0 || points[i - 1].id !== p.id
    if (q && q.id === p.id) segs.push([p.x, p.y, q.x, q.y])
    else if (startsStroke) segs.push([p.x, p.y, p.x, p.y])
  }
  return segs
}

function distToSeg(px: number, py: number, [x1, y1, x2, y2]: Seg) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
  const ex = x1 + t * dx - px
  const ey = y1 + t * dy - py
  return Math.sqrt(ex * ex + ey * ey)
}

/** Renders already-transformed segments (grid coordinates) into a 28 × 28 image with values 0…1. */
function render(segs: Seg[], width: number): Float32Array {
  const img = new Float32Array(GRID * GRID)
  const r = width / 2
  for (const s of segs) {
    const x0 = Math.max(0, Math.floor(Math.min(s[0], s[2]) - r - EDGE))
    const x1 = Math.min(GRID - 1, Math.ceil(Math.max(s[0], s[2]) + r + EDGE))
    const y0 = Math.max(0, Math.floor(Math.min(s[1], s[3]) - r - EDGE))
    const y1 = Math.min(GRID - 1, Math.ceil(Math.max(s[1], s[3]) + r + EDGE))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = distToSeg(x + 0.5, y + 0.5, s)
        const v = Math.max(0, Math.min(1, (r + EDGE / 2 - d) / EDGE))
        const k = y * GRID + x
        if (v > img[k]) img[k] = v
      }
    }
  }
  return img
}

export function centerOfMass(img: Float32Array) {
  let m = 0
  let cx = 0
  let cy = 0
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const v = img[y * GRID + x]
      m += v
      cx += v * (x + 0.5)
      cy += v * (y + 0.5)
    }
  }
  return m ? { x: cx / m, y: cy / m, mass: m } : { x: GRID / 2, y: GRID / 2, mass: 0 }
}

/**
 * MNIST-style input from pen strokes: the bounding box of the ink is scaled (keeping its
 * aspect ratio) so the longer side is 20 px, then the digit is moved so its center of mass
 * sits in the middle of the 28 × 28 grid. Returns null when there is nothing to classify.
 */
export function strokesToImage(points: Pt[], penWidth = PEN_WIDTH): Float32Array | null {
  if (!points.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const extent = Math.max(maxX - minX, maxY - minY)
  if (extent < 1e-6) return null
  // The pen adds half its width on every side, so the centre line gets BOX - penWidth.
  const scale = (BOX - penWidth) / extent
  const raw = segments(points)
  const place = (ox: number, oy: number) =>
    raw.map(([x1, y1, x2, y2]): Seg => [(x1 - minX) * scale + ox, (y1 - minY) * scale + oy, (x2 - minX) * scale + ox, (y2 - minY) * scale + oy])
  const ox = (GRID - (maxX - minX) * scale) / 2
  const oy = (GRID - (maxY - minY) * scale) / 2
  const first = render(place(ox, oy), penWidth)
  const com = centerOfMass(first)
  return render(place(ox + GRID / 2 - com.x, oy + GRID / 2 - com.y), penWidth)
}

/** Bilinear sample of a 28 × 28 image at continuous coordinates (pixel centres at i + 0.5). */
function sample(img: ArrayLike<number>, w: number, h: number, x: number, y: number) {
  const fx = x - 0.5
  const fy = y - 0.5
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const ax = fx - x0
  const ay = fy - y0
  const at = (xx: number, yy: number) => (xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : img[yy * w + xx])
  return (at(x0, y0) * (1 - ax) + at(x0 + 1, y0) * ax) * (1 - ay) + (at(x0, y0 + 1) * (1 - ax) + at(x0 + 1, y0 + 1) * ax) * ay
}

/**
 * Applies the same normalization to a scanned 28 × 28 digit (MNIST/EMNIST, values 0…1):
 * ink bounding box → longest side 20 px → centre of mass in the middle. Training data goes
 * through this so it matches what strokesToImage produces at inference time.
 */
export function normalizeImage(src: ArrayLike<number>, threshold = 0.15): Float32Array | null {
  let minX = GRID
  let minY = GRID
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (src[y * GRID + x] > threshold) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  if (maxX < 0) return null
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const s = BOX / Math.max(w, h)
  const build = (ox: number, oy: number) => {
    const out = new Float32Array(GRID * GRID)
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const sx = (x + 0.5 - ox) / s + minX
        const sy = (y + 0.5 - oy) / s + minY
        out[y * GRID + x] = Math.min(1, sample(src, GRID, GRID, sx, sy))
      }
    }
    return out
  }
  const ox = (GRID - w * s) / 2
  const oy = (GRID - h * s) / 2
  const com = centerOfMass(build(ox, oy))
  return build(ox + GRID / 2 - com.x, oy + GRID / 2 - com.y)
}

export function flipHorizontal(img: Float32Array): Float32Array {
  const out = new Float32Array(img.length)
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) out[y * GRID + x] = img[y * GRID + (GRID - 1 - x)]
  }
  return out
}

export function inkBox(img: Float32Array, threshold = 0.15) {
  let minX = GRID
  let minY = GRID
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (img[y * GRID + x] > threshold) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 }
}
