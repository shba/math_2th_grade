import { describe, expect, it } from 'vitest'
import { createRng } from '../exercises/rng'
import { makeUserTemplate, rawTemplateStrokes, recognizeDigit } from './digits'
import type { Pt } from './pdollar'

const rng = createRng(7)

/** A wobbly, rotated, rescaled copy of a template, like a child's drawing. */
function wobble(pts: Pt[], amount = 4, rot = 0.12): Pt[] {
  const angle = (rng.next() * 2 - 1) * rot
  const s = 0.6 + rng.next() * 0.8
  const sx = s * (0.85 + rng.next() * 0.3)
  return pts.map((p) => {
    const x = p.x - 50
    const y = p.y - 70
    return {
      x: (x * Math.cos(angle) - y * Math.sin(angle)) * sx + 200 + (rng.next() - 0.5) * amount,
      y: (x * Math.sin(angle) + y * Math.cos(angle)) * s + 100 + (rng.next() - 0.5) * amount,
      id: p.id,
    }
  })
}

describe('digit recognizer', () => {
  it('recognizes noisy versions of every digit', () => {
    let ok = 0
    let total = 0
    for (let d = 0; d <= 9; d++) {
      for (let k = 0; k < 12; k++) {
        const r = recognizeDigit(wobble(rawTemplateStrokes(d, k % 2 === 0 || d === 7 ? 0 : 1)))
        total++
        if (r?.digit === d && !r.mirrored) ok++
      }
    }
    expect(ok / total).toBeGreaterThan(0.9)
  })

  it('detects mirrored digits (2, 3, 5, 7, 9)', () => {
    for (const d of [2, 3, 5, 7, 9]) {
      let hits = 0
      for (let k = 0; k < 8; k++) {
        const r = recognizeDigit(wobble(rawTemplateStrokes(d, 0, true), 3, 0.08))
        if (r?.digit === d && r.mirrored) hits++
      }
      expect(hits, `digit ${d}`).toBeGreaterThanOrEqual(6)
    }
  })

  it('treats a tall stroke as 1', () => {
    const pts: Pt[] = Array.from({ length: 20 }, (_, i) => ({ x: 100 + (i % 2), y: i * 6, id: 0 }))
    expect(recognizeDigit(pts)?.digit).toBe(1)
  })

  it('learns from the child’s own confirmed samples', () => {
    // A squiggle that looks like nothing in the built-in set.
    const odd: Pt[] = Array.from({ length: 30 }, (_, i) => ({ x: i * 3, y: 40 + Math.sin(i / 2) * 30, id: 0 }))
    const user = makeUserTemplate(4, odd)
    expect(recognizeDigit(odd, [user])?.digit).toBe(4)
  })
})
