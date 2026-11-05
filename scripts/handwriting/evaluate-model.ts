// Measures the shipped digit model with the same decision rule the app uses
// (src/handwriting/decide.ts: the image as written plus its horizontal flip).
//
//   node --experimental-strip-types scripts/handwriting/evaluate-model.ts <data-dir> <model-dir>
//
// Reported on the MNIST and EMNIST test sets and on synthetic child-style strokes: digit accuracy,
// how often a normal digit is wrongly called mirrored, and how often a mirrored asymmetric digit
// (2 3 4 5 6 7 9; test digits flipped) is caught and read as the right digit.

import fs from 'node:fs'
import path from 'node:path'
// @ts-expect-error installed ad hoc, see train-digits.ts
import * as tf from '@tensorflow/tfjs-node'
import { decide } from '../../src/handwriting/decide.ts'
import { flipHorizontal, strokesToImage } from '../../src/handwriting/preprocess.ts'
import { MIRRORABLE, strokeSample, styleCount } from '../../src/handwriting/testing/strokeSamples.ts'

const [dataDir = 'data', modelDir = 'public/models/digits'] = process.argv.slice(2)
const N = 784

const model = await tf.loadLayersModel(`file://${path.resolve(modelDir, 'model.json')}`)

function predict(images: Float32Array[]): Float32Array[] {
  const out: Float32Array[] = []
  for (let s = 0; s < images.length; s += 1024) {
    const chunk = images.slice(s, s + 1024)
    const data = new Float32Array(chunk.length * N)
    chunk.forEach((img, i) => data.set(img, i * N))
    const y = tf.tidy(() => model.predict(tf.tensor4d(data, [chunk.length, 28, 28, 1])) as tf.Tensor)
    const p = y.dataSync() as Float32Array
    const k = y.shape[1]
    y.dispose()
    chunk.forEach((_, i) => out.push(p.slice(i * k, i * k + k)))
  }
  return out
}

const buf = fs.readFileSync(path.join(dataDir, 'norm-test.bin'))
const count = buf.length / (N + 2)
const labels: number[] = []
const sources: number[] = []
const imgs: Float32Array[] = []
for (let i = 0; i < count; i++) {
  labels.push(buf[i * (N + 2)])
  sources.push(buf[i * (N + 2) + 1])
  const img = new Float32Array(N)
  for (let k = 0; k < N; k++) img[k] = buf[i * (N + 2) + 2 + k] / 255
  imgs.push(img)
}
const flips = imgs.map(flipHorizontal)

const P = predict(imgs)
const Q = predict(flips)

function report(name: string, items: { d: number; i: number; mirror: boolean }[], up: Float32Array[], fl: Float32Array[]) {
  let ok = 0
  let n = 0
  let falseFlag = 0
  let caught = 0
  let caughtRead = 0
  let m = 0
  for (const { d, i, mirror } of items) {
    const r = decide(up[i], fl[i])
    if (!mirror) {
      n++
      if (r.digit === d) ok++
      if (r.mirrored) falseFlag++
    } else {
      m++
      if (r.mirrored) caught++
      if (r.mirrored && r.digit === d) caughtRead++
    }
  }
  const pct = (a: number, b: number) => `${a}/${b} = ${((100 * a) / b).toFixed(2)}%`
  console.log(`${name}: digits ${pct(ok, n)}; normal called mirrored ${pct(falseFlag, n)}` + (m ? `; mirrored caught ${pct(caught, m)}, caught and read right ${pct(caughtRead, m)}` : ''))
}

for (const [name, src] of [['MNIST test', 0], ['EMNIST test', 1]] as const) {
  const items: { d: number; i: number; mirror: boolean }[] = []
  labels.forEach((d, i) => sources[i] === src && items.push({ d, i, mirror: false }))
  report(name, items, P, Q)
  // A flipped test digit, as written, is the mirrored digit; its own flip is the original.
  const mirrored = labels.flatMap((d, i) => (sources[i] === src && MIRRORABLE.includes(d) ? [{ d, i, mirror: true }] : []))
  report(`${name} flipped`, mirrored, Q, P)
}

const strokes: { d: number; up: Float32Array; fl: Float32Array; mirror: boolean }[] = []
for (let d = 0; d < 10; d++) {
  for (let s = 0; s < styleCount(d); s++) {
    for (let seed = 0; seed < 40; seed++) {
      const img = strokesToImage(strokeSample(d, s, 1000 + seed * 7 + s))!
      strokes.push({ d, up: img, fl: flipHorizontal(img), mirror: false })
      if (MIRRORABLE.includes(d)) {
        const mi = strokesToImage(strokeSample(d, s, 2000 + seed * 7 + s, { mirror: true }))!
        strokes.push({ d, up: mi, fl: flipHorizontal(mi), mirror: true })
      }
    }
  }
}
report(
  'stroke samples',
  strokes.map((s, i) => ({ d: s.d, i, mirror: s.mirror })),
  predict(strokes.map((s) => s.up)),
  predict(strokes.map((s) => s.fl)),
)
