// $P point-cloud recognizer (Vatavu, Anthony & Wobbrock, 2012), adapted for single digits.

export interface Pt {
  x: number
  y: number
  id: number
}

export const NUM_POINTS = 32

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

function pathLength(points: Pt[]) {
  let d = 0
  for (let i = 1; i < points.length; i++) if (points[i].id === points[i - 1].id) d += dist(points[i - 1], points[i])
  return d
}

export function resample(input: Pt[], n = NUM_POINTS): Pt[] {
  const points = input.map((p) => ({ ...p }))
  const total = pathLength(points)
  if (total === 0) return Array.from({ length: n }, () => ({ ...points[0] }))
  const I = total / (n - 1)
  let D = 0
  const out: Pt[] = [{ ...points[0] }]
  for (let i = 1; i < points.length; i++) {
    if (points[i].id !== points[i - 1].id) continue
    const d = dist(points[i - 1], points[i])
    if (D + d >= I) {
      const t = (I - D) / d
      const q = { x: points[i - 1].x + t * (points[i].x - points[i - 1].x), y: points[i - 1].y + t * (points[i].y - points[i - 1].y), id: points[i].id }
      out.push(q)
      points.splice(i, 0, q)
      D = 0
    } else D += d
  }
  while (out.length < n) out.push({ ...points[points.length - 1] })
  return out.slice(0, n)
}

export function normalize(points: Pt[]): Pt[] {
  const pts = resample(points)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  const size = Math.max(maxX - minX, maxY - minY) || 1
  const scaled = pts.map((p) => ({ x: (p.x - minX) / size, y: (p.y - minY) / size, id: p.id }))
  const cx = scaled.reduce((s, p) => s + p.x, 0) / scaled.length
  const cy = scaled.reduce((s, p) => s + p.y, 0) / scaled.length
  return scaled.map((p) => ({ x: p.x - cx, y: p.y - cy, id: p.id }))
}

function cloudDistance(pts: Pt[], tmpl: Pt[], start: number) {
  const n = pts.length
  const matched = new Array<boolean>(n).fill(false)
  let sum = 0
  let i = start
  do {
    let index = -1
    let min = Infinity
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue
      const d = dist(pts[i], tmpl[j])
      if (d < min) {
        min = d
        index = j
      }
    }
    matched[index] = true
    const weight = 1 - ((i - start + n) % n) / n
    sum += weight * min
    i = (i + 1) % n
  } while (i !== start)
  return sum
}

export function greedyCloudMatch(points: Pt[], tmpl: Pt[]) {
  const e = 0.5
  const step = Math.floor(Math.pow(points.length, 1 - e))
  let min = Infinity
  for (let i = 0; i < points.length; i += step) {
    min = Math.min(min, cloudDistance(points, tmpl, i), cloudDistance(tmpl, points, i))
  }
  return min
}

/** Aspect ratio of the raw drawing (height / width), used to tell a "1" from wider digits. */
export function aspect(points: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  return (maxY - minY) / Math.max(1, maxX - minX)
}
