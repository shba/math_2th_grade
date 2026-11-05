import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as tf from '@tensorflow/tfjs-core'
import * as layers from '@tensorflow/tfjs-layers'
import '@tensorflow/tfjs-backend-cpu'
import { makeClassify, type Classify } from '../classifier'

const MODEL_DIR = join(import.meta.dirname, '../../../public/models/digits')

let cached: Promise<Classify> | null = null

/** Loads the shipped (quantized) model from disk, exactly as the browser loads it over HTTP. */
export function loadModelFromDisk(): Promise<Classify> {
  cached ??= (async () => {
    await tf.setBackend('cpu')
    const json = JSON.parse(readFileSync(join(MODEL_DIR, 'model.json'), 'utf8'))
    const group = json.weightsManifest[0]
    const bin = Buffer.concat(group.paths.map((p: string) => readFileSync(join(MODEL_DIR, p))))
    const weightData = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength)
    const model = await layers.loadLayersModel(tf.io.fromMemory({ modelTopology: json.modelTopology, weightSpecs: group.weights, weightData }))
    return makeClassify(tf, model)
  })()
  return cached
}
