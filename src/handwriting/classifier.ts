import type { LayersModel } from '@tensorflow/tfjs-layers'
import { GRID } from './preprocess'

/** Model outputs (see recognize.ts for the 17 classes), one array per 28 × 28 input image. */
export type Classify = (images: Float32Array[]) => Promise<Float32Array[]>

type Tf = typeof import('@tensorflow/tfjs-core')

export function makeClassify(tf: Tf, model: LayersModel): Classify {
  return async (images) => {
    const data = new Float32Array(images.length * GRID * GRID)
    images.forEach((img, i) => data.set(img, i * GRID * GRID))
    const x = tf.tensor4d(data, [images.length, GRID, GRID, 1])
    const y = model.predict(x) as import('@tensorflow/tfjs-core').Tensor
    const k = y.shape[1]!
    const probs = await y.data()
    tf.dispose([x, y])
    return images.map((_, i) => Float32Array.from(probs.subarray(i * k, i * k + k)))
  }
}

let loading: Promise<Classify> | null = null

/**
 * Loads TF.js (CPU backend; the model is small enough that this is fast everywhere) and the
 * quantized digit model on first use. Both are precached by the service worker for offline use.
 */
export function loadClassifier(url = `${import.meta.env.BASE_URL}models/digits/model.json`): Promise<Classify> {
  loading ??= (async () => {
    const [tf, layers] = await Promise.all([import('@tensorflow/tfjs-core'), import('@tensorflow/tfjs-layers'), import('@tensorflow/tfjs-backend-cpu')])
    await tf.setBackend('cpu')
    await tf.ready()
    const model = await layers.loadLayersModel(url)
    return makeClassify(tf, model)
  })()
  loading.catch(() => (loading = null))
  return loading
}
