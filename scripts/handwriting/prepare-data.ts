// Builds normalized MNIST + EMNIST-digits arrays for train-digits.ts.
//
//   node --experimental-strip-types scripts/handwriting/prepare-data.ts <data-dir>
//
// <data-dir> must contain:
//   mnist-{train,t10k}-{images-idx3,labels-idx1}-ubyte.gz  (https://storage.googleapis.com/cvdf-datasets/mnist/)
//   emnist-digits-{train,test}.csv.gz                      (EMNIST "digits" split, label + 784 pixels per row,
//                                                           already in MNIST orientation)
// Writes <data-dir>/norm-{train,test}.bin: per sample 1 label byte, 1 source byte (0 MNIST, 1 EMNIST), 784 pixel bytes.

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import zlib from 'node:zlib'
import { GRID, normalizeImage } from '../../src/handwriting/preprocess.ts'

const dir = process.argv[2] ?? 'data'
const N = GRID * GRID

function readIdx(file: string): Uint8Array {
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(dir, file)))
  const dims = buf[3]
  return new Uint8Array(buf.buffer, buf.byteOffset + 4 + dims * 4)
}

interface Set {
  labels: number[]
  sources: number[]
  pixels: Uint8Array[]
}

function push(set: Set, label: number, source: number, raw: ArrayLike<number>) {
  const f = new Float32Array(N)
  for (let i = 0; i < N; i++) f[i] = raw[i] / 255
  const norm = normalizeImage(f)
  if (!norm) return
  const out = new Uint8Array(N)
  for (let i = 0; i < N; i++) out[i] = Math.round(norm[i] * 255)
  set.labels.push(label)
  set.sources.push(source)
  set.pixels.push(out)
}

function mnist(set: Set, split: 'train' | 't10k') {
  const imgs = readIdx(`mnist-${split}-images-idx3-ubyte.gz`)
  const labels = readIdx(`mnist-${split}-labels-idx1-ubyte.gz`)
  for (let i = 0; i < labels.length; i++) push(set, labels[i], 0, imgs.subarray(i * N, (i + 1) * N))
}

async function emnist(set: Set, split: 'train' | 'test') {
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, `emnist-digits-${split}.csv.gz`)).pipe(zlib.createGunzip()) })
  for await (const line of rl) {
    const v = line.split(',').map(Number)
    if (v.length !== N + 1) continue
    push(set, v[0], 1, v.slice(1))
  }
}

function save(set: Set, name: string) {
  const out = Buffer.alloc(set.labels.length * (N + 2))
  set.labels.forEach((l, i) => {
    const o = i * (N + 2)
    out[o] = l
    out[o + 1] = set.sources[i]
    out.set(set.pixels[i], o + 2)
  })
  fs.writeFileSync(path.join(dir, name), out)
  const mass = new Array(10).fill(0)
  const count = new Array(10).fill(0)
  set.pixels.forEach((p, i) => {
    mass[set.labels[i]] += p.reduce((s, v) => s + v / 255, 0)
    count[set.labels[i]]++
  })
  console.log(name, set.labels.length, 'samples; mean ink mass per digit:', mass.map((m, d) => (m / count[d]).toFixed(1)).join(' '))
}

const train: Set = { labels: [], sources: [], pixels: [] }
mnist(train, 'train')
await emnist(train, 'train')
save(train, 'norm-train.bin')

const test: Set = { labels: [], sources: [], pixels: [] }
mnist(test, 't10k')
await emnist(test, 'test')
save(test, 'norm-test.bin')
