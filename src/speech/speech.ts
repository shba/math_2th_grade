import { stripNikud } from '../content/he/text'
import type { Choice, Token } from '../exercises/types'
import { numberToWords } from './numberWords'

export interface SpeechSettings {
  rate: number
  voiceURI?: string
  withNikud: boolean
  muted: boolean
}

const SETTINGS_KEY = 'mk-speech'

export function loadSpeechSettings(): SpeechSettings {
  try {
    return { rate: 0.9, withNikud: true, muted: false, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
  } catch {
    return { rate: 0.9, withNikud: true, muted: false }
  }
}

let settings = typeof localStorage === 'undefined' ? { rate: 0.9, withNikud: true, muted: false } : loadSpeechSettings()

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

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

let unlocked = false
let voice: SpeechSynthesisVoice | undefined

const listeners = new Set<(speaking: boolean) => void>()
export function onSpeakingChange(fn: (speaking: boolean) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const emit = (v: boolean) => listeners.forEach((l) => l(v))

function rankVoice(v: SpeechSynthesisVoice) {
  let s = 0
  if (/enhanced|natural|online|neural|premium/i.test(v.name)) s += 3
  if (/google/i.test(v.name)) s += 2
  if (v.localService) s += 1
  return s
}

export function hebrewVoices(): SpeechSynthesisVoice[] {
  if (!supported()) return []
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('he') || v.lang.toLowerCase().startsWith('iw'))
    .sort((a, b) => rankVoice(b) - rankVoice(a))
}

export function waitForVoices(timeout = 2500): Promise<SpeechSynthesisVoice[]> {
  if (!supported()) return Promise.resolve([])
  const now = hebrewVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => {
      speechSynthesis.removeEventListener('voiceschanged', done)
      resolve(hebrewVoices())
    }
    speechSynthesis.addEventListener('voiceschanged', done)
    setTimeout(done, timeout)
  })
}

function pickVoice() {
  const list = hebrewVoices()
  voice = list.find((v) => v.voiceURI === settings.voiceURI) ?? list[0]
  return voice
}

/** Must run inside a user gesture (the "let's start" tap) so later auto-reading is allowed. */
export function unlockSpeech() {
  if (!supported() || unlocked) return
  unlocked = true
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  u.lang = 'he-IL'
  speechSynthesis.speak(u)
  pickVoice()
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    void new Ctx().resume()
  } catch {
    /* audio context is optional */
  }
}

export const isSpeechUnlocked = () => unlocked

/** Replace digits and math signs with spoken words. */
export function textForSpeech(text: string): string {
  let t = text
    .replace(/\b(\d{1,2}):(\d\d)\b/g, (_, h, m) => (m === '00' ? h : m === '30' ? `${h} וָחֵצִי` : `${h} וְ־${m} דַּקּוֹת`))
    .replace(/(\d+)\s*×\s*(\d+)/g, (_, a, b) => `${a} כָּפוּל ${b}`)
    .replace(/(\d+)\s*:\s*(\d+)/g, (_, a, b) => `${a} חֶלְקֵי ${b}`)
    .replace(/(\d+)\s*\+\s*(\d+)/g, (_, a, b) => `${a} וְעוֹד ${b}`)
    .replace(/(\d+)\s*[−-]\s*(\d+)/g, (_, a, b) => `${a} פָּחוֹת ${b}`)
    .replace(/(\d),(\d{3})/g, '$1$2')
    .replace(/\d+/g, (m) => numberToWords(Number(m)))
    .replace(/[־]/g, ' ')
    .replace(/[״׳]/g, '')
  if (!settings.withNikud) t = stripNikud(t)
  return t.replace(/\s+/g, ' ').trim()
}

export function tokensForSpeech(tokens: Token[], blankWord = 'כַּמָּה'): string {
  return tokens
    .map((t) => {
      if (t.t === 'n') return numberToWords(t.v)
      if (t.t === 'blank') return blankWord
      if (t.t === 'w') return t.v
      return { '+': 'וְעוֹד', '-': 'פָּחוֹת', '×': 'כָּפוּל', ':': 'חֶלְקֵי', '=': 'שָׁוֶה', '<': 'קָטָן מִ', '>': 'גָּדוֹל מִ', ',': ',', '…': '' }[t.v]
    })
    .join(' ')
}

export const choicesForSpeech = (choices: Choice[]) =>
  choices.filter((c) => c.label || c.speak).map((c) => c.speak ?? c.label).join(', אוֹ ')

let queueId = 0

/** Speak one or more sentences; resolves when finished or interrupted. */
export function speak(text: string | string[]): Promise<void> {
  if (!supported() || settings.muted || profileMuted) return Promise.resolve()
  const id = ++queueId
  speechSynthesis.cancel()
  const parts = (Array.isArray(text) ? text : [text])
    .flatMap((p) => textForSpeech(p).split(/(?<=[.!?])\s+/))
    .filter((p) => p.trim())
  if (!parts.length) return Promise.resolve()
  if (!voice) pickVoice()
  emit(true)
  return new Promise((resolve) => {
    let i = 0
    const next = () => {
      if (id !== queueId || i >= parts.length) {
        if (id === queueId) emit(false)
        resolve()
        return
      }
      const u = new SpeechSynthesisUtterance(parts[i++])
      u.lang = 'he-IL'
      if (voice) u.voice = voice
      u.rate = settings.rate
      u.onend = next
      u.onerror = next
      speechSynthesis.speak(u)
    }
    next()
  })
}

export function stop() {
  queueId++
  if (supported()) speechSynthesis.cancel()
  emit(false)
}
