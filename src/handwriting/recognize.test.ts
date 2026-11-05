import { beforeAll, describe, expect, it } from 'vitest'
import type { Classify } from './classifier'
import { BOX, centerOfMass, GRID, inkBox, strokesToImage } from './preprocess'
import { decide, recognizeDigit } from './recognize'
import { loadModelFromDisk } from './testing/loadModel'
import { MIRRORABLE, strokeSample, styleCount } from './testing/strokeSamples'

const SEEDS = 10

let classify: Classify
beforeAll(async () => {
  classify = await loadModelFromDisk()
}, 60_000)

describe('preprocessing', () => {
  it('fits the digit into the 20 px box and centers its mass in the 28 × 28 grid', () => {
    for (let d = 0; d < 10; d++) {
      const img = strokesToImage(strokeSample(d, 0, 1))!
      const box = inkBox(img)!
      expect(Math.max(box.w, box.h)).toBeLessThanOrEqual(BOX + 1)
      const c = centerOfMass(img)
      expect(Math.abs(c.x - GRID / 2)).toBeLessThan(1)
      expect(Math.abs(c.y - GRID / 2)).toBeLessThan(1)
    }
  })

  it('gives the same image whatever the canvas size or brush', () => {
    const pts = strokeSample(3, 0, 7, { jitter: 0 })
    const big = pts.map((p) => ({ ...p, x: p.x * 3 + 40, y: p.y * 3 + 10 }))
    const a = strokesToImage(pts)!
    const b = strokesToImage(big)!
    let diff = 0
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i])
    expect(diff / a.length).toBeLessThan(0.02)
  })

  it('ignores a tap with no extent', () => {
    expect(strokesToImage([])).toBeNull()
  })
})

describe('digit recognizer (CNN)', () => {
  it('reads child-style digits 0–9', async () => {
    const perDigit: string[] = []
    let right = 0
    let total = 0
    for (let d = 0; d < 10; d++) {
      let ok = 0
      let n = 0
      for (let s = 0; s < styleCount(d); s++) {
        for (let seed = 0; seed < SEEDS; seed++) {
          const r = await recognizeDigit(strokeSample(d, s, seed * 31 + s), classify)
          n++
          if (r && r.digit === d && !r.mirrored) ok++
        }
      }
      perDigit.push(`${d}: ${((100 * ok) / n).toFixed(0)}%`)
      expect(ok / n, `digit ${d}`).toBeGreaterThanOrEqual(0.85)
      right += ok
      total += n
    }
    console.log(`stroke samples: ${right}/${total} = ${((100 * right) / total).toFixed(1)}%  (${perDigit.join(', ')})`)
    expect(right / total).toBeGreaterThanOrEqual(0.95)
  }, 120_000)

  it('notices mirrored digits and still reads them', async () => {
    let caught = 0
    let read = 0
    let n = 0
    for (const d of MIRRORABLE) {
      for (let s = 0; s < styleCount(d); s++) {
        for (let seed = 0; seed < SEEDS; seed++) {
          const r = await recognizeDigit(strokeSample(d, s, seed * 17 + s, { mirror: true }), classify)
          n++
          if (r?.mirrored) caught++
          if (r?.digit === d) read++
        }
      }
    }
    console.log(`mirrored samples: flagged ${caught}/${n} = ${((100 * caught) / n).toFixed(1)}%, digit read ${read}/${n}`)
    expect(caught / n).toBeGreaterThanOrEqual(0.6)
  }, 120_000)

  it('rarely calls a normal digit mirrored', async () => {
    let flagged = 0
    let n = 0
    for (let d = 0; d < 10; d++) {
      for (let s = 0; s < styleCount(d); s++) {
        for (let seed = 0; seed < SEEDS; seed++) {
          const r = await recognizeDigit(strokeSample(d, s, seed * 13 + 5), classify)
          n++
          if (r?.mirrored) flagged++
        }
      }
    }
    console.log(`false mirror flags: ${flagged}/${n}`)
    expect(flagged / n).toBeLessThanOrEqual(0.03)
  }, 120_000)
})

describe('mirror decision', () => {
  const p = (k: number, v: number) => Array.from({ length: 17 }, (_, i) => (i === k ? v : (1 - v) / 16))
  const MIRRORED_3 = 11

  it('keeps a confident upright reading', () => {
    expect(decide(p(3, 0.95), p(MIRRORED_3, 0.9))).toMatchObject({ digit: 3, mirrored: false })
  })

  it('flags a backwards digit when both views agree', () => {
    expect(decide(p(MIRRORED_3, 0.8), p(3, 0.97))).toMatchObject({ digit: 3, mirrored: true })
  })

  it('lets the flipped view settle an unsure upright reading', () => {
    expect(decide(p(8, 0.4), p(3, 0.97))).toMatchObject({ digit: 3, mirrored: true })
  })

  it('never calls a symmetric digit mirrored', () => {
    expect(decide(p(0, 0.9), p(0, 0.9))).toMatchObject({ digit: 0, mirrored: false })
  })
})
