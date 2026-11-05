import type { Classify } from './classifier'
import { decide, type DigitResult } from './decide'
import { flipHorizontal, strokesToImage, type Pt } from './preprocess'

export { decide, MIRRORABLE, type DigitResult } from './decide'

export async function recognizeDigit(points: Pt[], classify: Classify): Promise<DigitResult | null> {
  const img = strokesToImage(points)
  if (!img) return null
  const [upright, flipped] = await classify([img, flipHorizontal(img)])
  return decide(upright, flipped)
}
