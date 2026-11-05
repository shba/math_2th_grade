import type { Piece } from './speechText'

// Pre-recorded clips (he-IL-HilaNeural, see scripts/generate_speech.py) are
// decoded with Web Audio, trimmed of their silent edges and stitched into one
// buffer per utterance, so a sentence built from several clips plays without
// gaps or clicks. The buffer is played through an <audio> element because only
// media elements change speed without changing pitch.

const BASE = `${import.meta.env.BASE_URL}audio/he/`
const RATE = 24000

const GAP_S: Record<Piece['gap'], number> = { none: 0.025, comma: 0.18, sentence: 0.38 }
const FADE_S = 0.005
const THRESHOLD = 0.004
const LEAD_S = 0.012
const TAIL_S = 0.04

let manifest: Promise<Record<string, string> | null> | undefined

/** Clip index: phrase key → clip file id. Null when the audio folder is missing or offline and uncached. */
export function loadManifest(): Promise<Record<string, string> | null> {
  manifest ??= fetch(`${BASE}manifest.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((m: { clips?: Record<string, string> } | null) => (m?.clips && Object.keys(m.clips).length ? m.clips : null))
    .catch(() => null)
  return manifest
}

export const clipUrl = (id: string) => `${BASE}${id}.mp3`

type OfflineCtor = new (channels: number, length: number, rate: number) => OfflineAudioContext
let decoder: BaseAudioContext | undefined
function getDecoder(): BaseAudioContext {
  if (!decoder) {
    const w = window as unknown as { OfflineAudioContext?: OfflineCtor; webkitOfflineAudioContext?: OfflineCtor }
    const Ctor = w.OfflineAudioContext ?? w.webkitOfflineAudioContext
    if (!Ctor) throw new Error('Web Audio unavailable')
    decoder = new Ctor(1, 1, RATE)
  }
  return decoder
}

/** Cut leading/trailing silence (TTS padding and MP3 encoder delay) and fade the edges. */
export function trimClip(data: Float32Array, rate = RATE): Float32Array {
  let start = 0
  let end = data.length
  while (start < end && Math.abs(data[start]) < THRESHOLD) start++
  while (end > start && Math.abs(data[end - 1]) < THRESHOLD) end--
  if (start >= end) return new Float32Array(0)
  start = Math.max(0, start - Math.round(LEAD_S * rate))
  end = Math.min(data.length, end + Math.round(TAIL_S * rate))
  const out = data.slice(start, end)
  const fade = Math.min(Math.round(FADE_S * rate), out.length >> 1)
  for (let i = 0; i < fade; i++) {
    const g = i / fade
    out[i] *= g
    out[out.length - 1 - i] *= g
  }
  return out
}

const decoded = new Map<string, Promise<Float32Array>>()

function clipSamples(id: string): Promise<Float32Array> {
  let p = decoded.get(id)
  if (!p) {
    p = fetch(clipUrl(id))
      .then((r) => {
        if (!r.ok) throw new Error(`clip ${id}: ${r.status}`)
        return r.arrayBuffer()
      })
      .then((buf) => new Promise<AudioBuffer>((ok, fail) => void getDecoder().decodeAudioData(buf, ok, fail)))
      .then((b) => trimClip(b.getChannelData(0), b.sampleRate))
    p.catch(() => decoded.delete(id))
    decoded.set(id, p)
  }
  return p
}

/** Decode the clips of an utterance and join them into one stream of samples. */
export async function stitch(pieces: Piece[], clips: Record<string, string>): Promise<Float32Array> {
  const parts = await Promise.all(pieces.map((p) => clipSamples(clips[p.key])))
  const gaps = pieces.map((p, i) => (i === 0 ? 0 : Math.round(GAP_S[p.gap] * RATE)))
  const total = parts.reduce((s, x, i) => s + x.length + gaps[i], 0)
  const out = new Float32Array(total)
  let at = 0
  parts.forEach((x, i) => {
    at += gaps[i]
    out.set(x, at)
    at += x.length
  })
  return out
}

export function wavBlob(samples: Float32Array, rate = RATE): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}

let player: HTMLAudioElement | undefined
let finishCurrent: (() => void) | undefined

function getPlayer() {
  if (!player) {
    player = new Audio()
    player.preload = 'auto'
  }
  return player
}

/** Call inside a user gesture so iOS lets this element play later without one. */
export function unlockPlayer() {
  const a = getPlayer()
  a.src = URL.createObjectURL(wavBlob(new Float32Array(240)))
  a.play().catch(() => {})
}

export function playSamples(samples: Float32Array, speed: number): Promise<void> {
  stopPlayer()
  const a = getPlayer()
  const url = URL.createObjectURL(wavBlob(samples))
  return new Promise((resolve) => {
    const done = () => {
      a.onended = a.onerror = null
      if (finishCurrent === done) finishCurrent = undefined
      URL.revokeObjectURL(url)
      resolve()
    }
    finishCurrent = done
    a.onended = done
    a.onerror = done
    a.src = url
    const pitch = a as HTMLAudioElement & { webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean }
    pitch.preservesPitch = pitch.webkitPreservesPitch = pitch.mozPreservesPitch = true
    a.defaultPlaybackRate = speed
    a.playbackRate = speed
    a.play().catch(done)
  })
}

export function stopPlayer() {
  if (player && !player.paused) player.pause()
  finishCurrent?.()
}

/** Fetch every clip so the service worker caches the whole voice for offline use. */
export async function downloadAll(onProgress: (done: number, total: number) => void): Promise<number> {
  const clips = await loadManifest()
  if (!clips) return 0
  const ids = [...new Set(Object.values(clips))]
  const total = ids.length
  let done = 0
  let failed = 0
  const worker = async () => {
    while (ids.length) {
      const id = ids.pop()!
      await fetch(clipUrl(id)).then((r) => r.ok || failed++, () => failed++)
      onProgress(++done, total)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  return failed
}
