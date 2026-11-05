// Device speech, used only for sentences that have no recorded clip.
// Chrome stops long utterances after ~15 s and sometimes never fires onend, so
// text is cut into short chunks, a pause()/resume() keepalive runs while
// speaking, and each chunk has a watchdog.

export const webSpeechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

const MAX_CHUNK = 140
const KEEPALIVE_MS = 10000
const isAndroid = () => /Android/i.test(navigator.userAgent)

function rankVoice(v: SpeechSynthesisVoice) {
  let s = 0
  if (/enhanced|natural|online|neural|premium/i.test(v.name)) s += 3
  if (/google/i.test(v.name)) s += 2
  if (v.localService) s += 1
  return s
}

export function hebrewVoices(): SpeechSynthesisVoice[] {
  if (!webSpeechSupported()) return []
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('he') || v.lang.toLowerCase().startsWith('iw'))
    .sort((a, b) => rankVoice(b) - rankVoice(a))
}

export function waitForVoices(timeout = 2500): Promise<SpeechSynthesisVoice[]> {
  if (!webSpeechSupported()) return Promise.resolve([])
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

/** Split at sentence ends, then commas, then spaces, so no chunk exceeds `max` characters. */
export function chunkText(text: string, max = MAX_CHUNK): string[] {
  const out: string[] = []
  const push = (s: string, seps: RegExp[]) => {
    s = s.trim()
    if (!s) return
    if (s.length <= max || !seps.length) {
      out.push(s)
      return
    }
    const [sep, ...rest] = seps
    let cur = ''
    for (const part of s.split(sep)) {
      if (cur && (cur + ' ' + part).length > max) {
        push(cur, rest)
        cur = part
      } else cur = cur ? `${cur} ${part}` : part
    }
    push(cur, rest)
  }
  push(text, [/(?<=[.!?:;])\s+/, /(?<=[,—])\s+/, /\s+/])
  return out
}

export function unlockWebSpeech() {
  if (!webSpeechSupported()) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  u.lang = 'he-IL'
  speechSynthesis.speak(u)
}

// Chrome garbage-collects pending utterances and then never fires onend.
const alive = new Set<SpeechSynthesisUtterance>()

export function webSpeak(text: string, opts: { rate: number; voiceURI?: string }, isCurrent: () => boolean): Promise<void> {
  if (!webSpeechSupported()) return Promise.resolve()
  const chunks = chunkText(text)
  const voice = hebrewVoices().find((v) => v.voiceURI === opts.voiceURI) ?? hebrewVoices()[0]
  return new Promise((resolve) => {
    let i = 0
    let watchdog: ReturnType<typeof setTimeout> | undefined
    const keepalive = isAndroid()
      ? undefined
      : setInterval(() => {
          if (speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause()
            speechSynthesis.resume()
          }
        }, KEEPALIVE_MS)
    const finish = () => {
      clearInterval(keepalive)
      clearTimeout(watchdog)
      resolve()
    }
    const next = () => {
      clearTimeout(watchdog)
      if (!isCurrent() || i >= chunks.length) return finish()
      const u = new SpeechSynthesisUtterance(chunks[i++])
      u.lang = 'he-IL'
      if (voice) u.voice = voice
      u.rate = opts.rate
      alive.add(u)
      const end = () => {
        alive.delete(u)
        u.onend = u.onerror = null
        next()
      }
      u.onend = end
      u.onerror = end
      if (speechSynthesis.paused) speechSynthesis.resume()
      speechSynthesis.speak(u)
      watchdog = setTimeout(() => {
        speechSynthesis.cancel()
        end()
      }, 4000 + (u.text.length * 160) / opts.rate)
    }
    // Speaking straight after cancel() is sometimes dropped by Chrome.
    setTimeout(next, 60)
  })
}

export function cancelWebSpeech() {
  if (webSpeechSupported()) speechSynthesis.cancel()
}
