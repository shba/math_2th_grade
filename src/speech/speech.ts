import { hasNikud, stripNikud } from '../content/he/text'
import { loadManifest, playSamples, stitch, stopPlayer, unlockPlayer } from './clips'
import { coverSentence, toSentences, type Piece } from './speechText'
import { cancelWebSpeech, unlockWebSpeech, webSpeak } from './webSpeech'

export { choicesForSpeech, tokensForSpeech } from './phrasing'
export { hebrewVoices, waitForVoices } from './webSpeech'
export { downloadAll as downloadAllClips, loadManifest } from './clips'

export interface SpeechSettings {
  /** Playback speed, 1 = the recorded pace. */
  speed: number
  /** Device voice for the fallback. */
  voiceURI?: string
  /** Send vocalized text to the device voice. */
  withNikud: boolean
  muted: boolean
  /** Read each new question aloud as it appears; otherwise only the speaker button reads it. */
  autoReadQuestions: boolean
}

export const SPEEDS = [0.75, 0.85, 1, 1.15, 1.3]

const SETTINGS_KEY = 'mk-speech'
const DEFAULTS: SpeechSettings = { speed: 1, withNikud: true, muted: false, autoReadQuestions: false }

export function loadSpeechSettings(): SpeechSettings {
  try {
    const { rate: _old, ...saved } = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    return { ...DEFAULTS, ...saved }
  } catch {
    return { ...DEFAULTS }
  }
}

let settings = typeof localStorage === 'undefined' ? { ...DEFAULTS } : loadSpeechSettings()

export function saveSpeechSettings(s: Partial<SpeechSettings>) {
  settings = { ...settings, ...s }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export const getSpeechSettings = () => settings

/** Per-profile mute from the parent screen, layered on the device-wide setting. */
let profileMuted = false
export const setProfileMuted = (m: boolean) => {
  profileMuted = m
  if (m) stop()
}

const listeners = new Set<(speaking: boolean) => void>()
export function onSpeakingChange(fn: (speaking: boolean) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const emit = (v: boolean) => listeners.forEach((l) => l(v))

let unlocked = false

/** Must run inside a user gesture (the "let's start" tap) so later auto-reading is allowed. */
export function unlockSpeech() {
  void loadManifest()
  if (unlocked || typeof window === 'undefined') return
  unlocked = true
  unlockPlayer()
  unlockWebSpeech()
}

export const isSpeechUnlocked = () => unlocked

type Part = { kind: 'clips'; pieces: Piece[] } | { kind: 'device'; text: string }

/** Recorded clips for every sentence that has them; device speech only for the rest. */
export async function planSpeech(text: string | string[]): Promise<{ parts: Part[]; clips: Record<string, string> | null }> {
  const clips = await loadManifest()
  const has = (k: string) => !!clips && k in clips
  const parts: Part[] = []
  for (const s of (Array.isArray(text) ? text : [text]).flatMap((t) => toSentences(t))) {
    // App text is vocalized; an unvocalized word is typed by the user (a child's name) and has no
    // recording. Skipping it beats switching to the device voice mid-sentence.
    const vocalized = s.filter((w) => w.num || hasNikud(w.say))
    const cover = clips ? (coverSentence(s, has) ?? (vocalized.length ? coverSentence(vocalized, has) : null)) : null
    const last = parts[parts.length - 1]
    if (cover) {
      if (last?.kind === 'clips') {
        cover[0].gap = 'sentence'
        last.pieces.push(...cover)
      } else parts.push({ kind: 'clips', pieces: cover })
    } else {
      const words = s.map((w) => w.say).join(' ')
      if (clips && import.meta.env.DEV) console.warn('[speech] no clip for:', words)
      if (last?.kind === 'device') last.text += ` ${words}`
      else parts.push({ kind: 'device', text: words })
    }
  }
  return { parts, clips }
}

let queueId = 0

/** Speak one or more sentences; resolves when finished or interrupted. */
export async function speak(text: string | string[]): Promise<void> {
  if (settings.muted || profileMuted || typeof window === 'undefined') return
  const id = ++queueId
  stopPlayer()
  cancelWebSpeech()
  const current = () => id === queueId
  const { parts, clips } = await planSpeech(text)
  if (!current() || !parts.length) return
  emit(true)
  // Decode every clip part up front so parts follow each other without a wait.
  const audio = parts.map((p) => (p.kind === 'clips' && clips ? stitch(p.pieces, clips).catch(() => null) : null))
  for (let i = 0; i < parts.length && current(); i++) {
    const p = parts[i]
    const samples = await audio[i]
    if (!current()) break
    if (samples) await playSamples(samples, settings.speed)
    else {
      const words = p.kind === 'device' ? p.text : p.pieces.map((x) => x.key).join(' ')
      await webSpeak(settings.withNikud ? words : stripNikud(words), { rate: 0.9 * settings.speed, voiceURI: settings.voiceURI }, current)
    }
  }
  if (current()) emit(false)
}

/** For a question that just appeared: read it only if the parent turned on automatic reading. */
export function speakQuestion(text: string | string[]): Promise<void> {
  return settings.autoReadQuestions ? speak(text) : Promise.resolve()
}

export function stop() {
  queueId++
  stopPlayer()
  cancelWebSpeech()
  emit(false)
}
