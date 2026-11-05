export interface DigitResult {
  digit: number
  /** The child wrote this digit mirrored (e.g. a backwards 3). */
  mirrored: boolean
  confidence: number
  /** Other likely digits, most likely first (for the confirm step). */
  alternatives: number[]
}

/**
 * The model has 17 outputs: digits 0–9 as written, then these digits written mirrored.
 * 0, 1 and 8 look the same mirrored, so they have no mirror class.
 */
export const MIRRORABLE = [2, 3, 4, 5, 6, 7, 9]
const mirrorClass = (d: number) => {
  const i = MIRRORABLE.indexOf(d)
  return i < 0 ? -1 : 10 + i
}

/**
 * Combines the reading of the image as written with the reading of its horizontal flip:
 * "d as written" is supported by the upright class d and by the flipped image looking like a
 * mirrored d, and "d mirrored" by the mirror class upright and by a plain d once flipped.
 * Each output appears once on each side, so the scores sum to 1.
 */
export function decide(upright: ArrayLike<number>, flipped: ArrayLike<number>): DigitResult {
  const hyps: { digit: number; mirrored: boolean; score: number }[] = []
  for (let d = 0; d < 10; d++) {
    const m = mirrorClass(d)
    hyps.push({ digit: d, mirrored: false, score: (upright[d] + flipped[m < 0 ? d : m]) / 2 })
    if (m >= 0) hyps.push({ digit: d, mirrored: true, score: (upright[m] + flipped[d]) / 2 })
  }
  hyps.sort((a, b) => b.score - a.score)
  const best = hyps[0]
  const alternatives: number[] = []
  for (const h of hyps.slice(1)) {
    if (h.digit !== best.digit && !alternatives.includes(h.digit)) alternatives.push(h.digit)
    if (alternatives.length === 2) break
  }
  // The same digit both ways is one reading for the child, so its confidence is the sum.
  const sameDigit = hyps.filter((h) => h.digit === best.digit).reduce((s, h) => s + h.score, 0)
  return { digit: best.digit, mirrored: best.mirrored, confidence: sameDigit, alternatives }
}
