// Trains the digit CNN used by src/handwriting/classifier.ts.
//
//   npm i --no-save @tensorflow/tfjs-node@4
//   node --experimental-strip-types scripts/handwriting/prepare-data.ts <data-dir>
//   node --experimental-strip-types scripts/handwriting/train-digits.ts <data-dir> <out-dir> [epochs]
//
// Writes a float32 TF.js layers model to <out-dir>/float. quantize-model.ts turns it into the
// uint8 model shipped in public/models/digits/.

import fs from 'node:fs'
import path from 'node:path'
// @ts-expect-error installed ad hoc, see header
import * as tf from '@tensorflow/tfjs-node'

const [dataDir = 'data', outDir = 'out', epochsArg = '8'] = process.argv.slice(2)
const EPOCHS = Number(epochsArg)
const N = 784
const BATCH = 256
/** Outputs 0–9 are digits as written; 10–16 are mirrored 2 3 4 5 6 7 9 (MIRROR_CLASSES in recognize.ts). */
const MIRRORABLE = [2, 3, 4, 5, 6, 7, 9]
const CLASSES = 10 + MIRRORABLE.length
const MIRROR_P = 0.25

function load(name: string) {
  const buf = fs.readFileSync(path.join(dataDir, name))
  const count = buf.length / (N + 2)
  const labels = new Uint8Array(count)
  const sources = new Uint8Array(count)
  const pixels = new Uint8Array(count * N)
  for (let i = 0; i < count; i++) {
    labels[i] = buf[i * (N + 2)]
    sources[i] = buf[i * (N + 2) + 1]
    pixels.set(buf.subarray(i * (N + 2) + 2, (i + 1) * (N + 2)), i * N)
  }
  return { count, labels, sources, pixels }
}

const train = load('norm-train.bin')
const test = load('norm-test.bin')
console.log('train', train.count, 'test', test.count)

/** Random affine warp (rotation, scale, aspect, shear, shift about the centre), bilinear. */
function augmentInto(src: Uint8Array, off: number, dst: Float32Array, at: number, flip = false) {
  const th = ((Math.random() * 2 - 1) * 12 * Math.PI) / 180
  const s = 0.85 + Math.random() * 0.25
  const sx = s * (1 + (Math.random() * 2 - 1) * 0.12)
  const sy = s
  const sh = (Math.random() * 2 - 1) * 0.2
  const tx = (Math.random() * 2 - 1) * 1.5
  const ty = (Math.random() * 2 - 1) * 1.5
  const c = Math.cos(th)
  const sn = Math.sin(th)
  const a = [c * sx, (c * sh - sn) * sy, sn * sx, (sn * sh + c) * sy]
  const det = a[0] * a[3] - a[1] * a[2]
  const inv = [a[3] / det, -a[1] / det, -a[2] / det, a[0] / det]
  const px = (x: number, y: number) => (x < 0 || y < 0 || x > 27 || y > 27 ? 0 : src[off + y * 28 + (flip ? 27 - x : x)])
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const dx = x + 0.5 - 14 - tx
      const dy = y + 0.5 - 14 - ty
      const fx = inv[0] * dx + inv[1] * dy + 14 - 0.5
      const fy = inv[2] * dx + inv[3] * dy + 14 - 0.5
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const ax = fx - x0
      const ay = fy - y0
      const v = (px(x0, y0) * (1 - ax) + px(x0 + 1, y0) * ax) * (1 - ay) + (px(x0, y0 + 1) * (1 - ax) + px(x0 + 1, y0 + 1) * ax) * ay
      dst[at + y * 28 + x] = v / 255
    }
  }
}

/**
 * Israeli children write 1 with a flag (a short diagonal up-stroke at the top), which is rare in
 * MNIST; without this the model reads such a 1 as 7. Draws that flag onto a 1, anti-aliased.
 */
function addFlag(dst: Float32Array, at: number) {
  let top = -1
  let sumX = 0
  let cnt = 0
  let bottom = -1
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      if (dst[at + y * 28 + x] > 0.5) {
        if (top < 0) top = y
        bottom = y
        if (y - top < 2) {
          sumX += x
          cnt++
        }
      }
    }
  }
  if (top < 0 || !cnt) return
  const x0 = sumX / cnt + 0.5
  const y0 = top + 0.5
  const len = (bottom - top) * (0.25 + Math.random() * 0.2)
  const ang = ((25 + Math.random() * 35) * Math.PI) / 180
  const x1 = x0 - len * Math.cos(ang)
  const y1 = y0 + len * Math.sin(ang)
  const half = 0.9 + Math.random() * 0.6
  const vx = x1 - x0
  const vy = y1 - y0
  const vv = vx * vx + vy * vy
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / vv))
      const d = Math.hypot(px - (x0 + t * vx), py - (y0 + t * vy))
      const v = Math.max(0, Math.min(1, half + 0.5 - d))
      const k = at + y * 28 + x
      if (v > dst[k]) dst[k] = v
    }
  }
}

function batch(set: ReturnType<typeof load>, idx: Uint32Array, augment: boolean, flipAll = false) {
  const b = idx.length
  const x = new Float32Array(b * N)
  const y = new Float32Array(b * CLASSES)
  for (let i = 0; i < b; i++) {
    const k = idx[i]
    const label = set.labels[k]
    const m = MIRRORABLE.indexOf(label)
    const flip = m >= 0 && (flipAll || (augment && Math.random() < MIRROR_P))
    if (augment) augmentInto(set.pixels, k * N, x, i * N, flip)
    if (augment && label === 1 && Math.random() < 0.35) addFlag(x, i * N)
    else for (let p = 0; p < N; p++) x[i * N + p] = set.pixels[k * N + (flip ? p - (p % 28) + 27 - (p % 28) : p)] / 255
    y[i * CLASSES + (flip ? 10 + m : label)] = 1
  }
  return tf.tidy(() => {
    let xs = tf.tensor4d(x, [b, 28, 28, 1])
    if (augment) {
      // Pen-width variation: some samples thicker, some thinner.
      const r = tf.randomUniform([b, 1, 1, 1])
      const thick = tf.maxPool(xs, 2, 1, 'same')
      const thin = tf.neg(tf.maxPool(tf.neg(xs), 2, 1, 'same'))
      xs = tf.where(tf.less(r, 0.25).tile([1, 28, 28, 1]), thick, tf.where(tf.greater(r, 0.85).tile([1, 28, 28, 1]), thin, xs))
      xs = tf.clipByValue(tf.mul(xs, tf.randomUniform([b, 1, 1, 1], 0.9, 1.3)), 0, 1)
    }
    return { xs, ys: tf.tensor2d(y, [b, CLASSES]) }
  })
}

function shuffled(n: number) {
  const a = new Uint32Array(n)
  for (let i = 0; i < n; i++) a[i] = i
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const model = tf.sequential({
  layers: [
    tf.layers.conv2d({ inputShape: [28, 28, 1], filters: 32, kernelSize: 3, activation: 'relu', name: 'c1' }),
    tf.layers.conv2d({ filters: 32, kernelSize: 3, activation: 'relu', name: 'c2' }),
    tf.layers.maxPooling2d({ poolSize: 2, name: 'p1' }),
    tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu', name: 'c3' }),
    tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu', name: 'c4' }),
    tf.layers.maxPooling2d({ poolSize: 2, name: 'p2' }),
    tf.layers.flatten({ name: 'f' }),
    tf.layers.dropout({ rate: 0.3, name: 'd1' }),
    tf.layers.dense({ units: 128, activation: 'relu', name: 'fc' }),
    tf.layers.dropout({ rate: 0.3, name: 'd2' }),
    tf.layers.dense({ units: CLASSES, activation: 'softmax', name: 'out' }),
  ],
})
model.summary()

/** Digit accuracy (as written) per source, and how many flipped asymmetric digits land in their mirror class. */
function evaluate(set: ReturnType<typeof load>) {
  const correct = [0, 0]
  const total = [0, 0]
  let mirrored = 0
  let mirrorTotal = 0
  let falseMirror = 0
  for (let s = 0; s < set.count; s += 2000) {
    const idx = new Uint32Array(Math.min(2000, set.count - s)).map((_, i) => s + i)
    for (const flipAll of [false, true]) {
      const { xs, ys } = batch(set, idx, false, flipAll)
      const pred = (model.predict(xs) as tf.Tensor).argMax(1).dataSync()
      idx.forEach((k, i) => {
        const label = set.labels[k]
        if (!flipAll) {
          total[set.sources[k]]++
          if (pred[i] === label) correct[set.sources[k]]++
          if (pred[i] >= 10) falseMirror++
        } else if (MIRRORABLE.includes(label)) {
          mirrorTotal++
          if (pred[i] === 10 + MIRRORABLE.indexOf(label)) mirrored++
        }
      })
      tf.dispose([xs, ys])
    }
  }
  return { mnist: correct[0] / total[0], emnist: correct[1] / total[1], mirrored: mirrored / mirrorTotal, falseMirror: falseMirror / set.count }
}

for (let epoch = 0; epoch < EPOCHS; epoch++) {
  const lr = epoch < EPOCHS - 2 ? 1e-3 : epoch === EPOCHS - 2 ? 3e-4 : 1e-4
  model.compile({ optimizer: tf.train.adam(lr), loss: 'categoricalCrossentropy', metrics: ['accuracy'] })
  const order = shuffled(train.count)
  const t0 = Date.now()
  let loss = 0
  let acc = 0
  let n = 0
  for (let s = 0; s + BATCH <= train.count; s += BATCH) {
    const { xs, ys } = batch(train, order.subarray(s, s + BATCH), true)
    const [l, a] = (await model.trainOnBatch(xs, ys)) as number[]
    loss += l
    acc += a
    n++
    tf.dispose([xs, ys])
  }
  const ev = evaluate(test)
  console.log(`epoch ${epoch + 1}/${EPOCHS} lr ${lr} loss ${(loss / n).toFixed(4)} acc ${(acc / n).toFixed(4)} test mnist ${(ev.mnist * 100).toFixed(2)}% emnist ${(ev.emnist * 100).toFixed(2)}% mirrored ${(ev.mirrored * 100).toFixed(2)}% false-mirror ${(ev.falseMirror * 100).toFixed(2)}% (${Math.round((Date.now() - t0) / 1000)}s)`)
}

fs.mkdirSync(path.join(outDir, 'float'), { recursive: true })
await model.save(`file://${path.resolve(outDir, 'float')}`)
console.log('saved', path.join(outDir, 'float'))
