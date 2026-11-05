/**
 * Rewrites a float32 TF.js layers model with uint8 weights (affine min/scale per tensor), which
 * TF.js dequantizes on load. Kernels shrink 4×; small bias vectors stay float32.
 *
 *   node --experimental-strip-types scripts/handwriting/quantize-model.ts <float-dir> <out-dir>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface WeightSpec {
  name: string
  shape: number[]
  dtype: string
  quantization?: { dtype: 'uint8'; min: number; scale: number; original_dtype: 'float32' }
}

const [, , src, out] = process.argv
if (!src || !out) {
  console.error('usage: quantize-model.ts <float-dir> <out-dir>')
  process.exit(1)
}

const model = JSON.parse(readFileSync(join(src, 'model.json'), 'utf8'))
const groups: { paths: string[]; weights: WeightSpec[] }[] = model.weightsManifest
const chunks: Uint8Array[] = []
const specs: WeightSpec[] = []
let inBytes = 0

for (const group of groups) {
  const buf = Buffer.concat(group.paths.map((p) => readFileSync(join(src, p))))
  const data = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
  inBytes += buf.byteLength
  let offset = 0
  for (const w of group.weights) {
    if (w.dtype !== 'float32') throw new Error(`unexpected dtype ${w.dtype} for ${w.name}`)
    const n = w.shape.reduce((a, b) => a * b, 1)
    const values = data.subarray(offset, offset + n)
    offset += n
    if (n < 256) {
      chunks.push(new Uint8Array(Float32Array.from(values).buffer))
      specs.push({ name: w.name, shape: w.shape, dtype: 'float32' })
      continue
    }
    let min = Infinity
    let max = -Infinity
    for (const v of values) {
      if (v < min) min = v
      if (v > max) max = v
    }
    const scale = (max - min) / 255 || 1
    const q = new Uint8Array(n)
    for (let i = 0; i < n; i++) q[i] = Math.round((values[i] - min) / scale)
    chunks.push(q)
    specs.push({ name: w.name, shape: w.shape, dtype: 'float32', quantization: { dtype: 'uint8', min, scale, original_dtype: 'float32' } })
  }
}

const bin = Buffer.concat(chunks)
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'digits.bin'), bin)
model.weightsManifest = [{ paths: ['digits.bin'], weights: specs }]
model.format = 'layers-model'
model.generatedBy = 'scripts/handwriting/train-digits.ts + quantize-model.ts'
writeFileSync(join(out, 'model.json'), JSON.stringify(model))
console.log(`weights ${(inBytes / 1024).toFixed(0)} KB → ${(bin.byteLength / 1024).toFixed(0)} KB`)
