import { numberToWords, withVav } from './numberWords'

// Turns child-facing text into sentences of words for the clip player. The
// prep script (scripts/collect-speech.ts) runs the same code, so the clip keys
// it writes always match what the app looks up at runtime.

export interface Word {
  /** What the voice should read, with nikud and punctuation. */
  say: string
  /** Lookup form: punctuation stripped. */
  key: string
  /** Part of a spoken number. */
  num: boolean
  /** A comma or dash follows, so a short breath fits here. */
  pause: boolean
}

export type Sentence = Word[]

const PUNCT = /[.,!?:;"()…—–\u05BE]+$|^[.,!?:;"()…—–]+/g

export const wordKey = (w: string) => w.replace(PUNCT, '').replace(/[.,!?:;"()…]/g, '')

/** Digits and math signs become words; times, products and quotients get their spoken form. */
export function normalizeMath(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\b(\d{1,2}):(\d\d)\b/g, (_, h, m) => (m === '00' ? h : m === '30' ? `${h} וָחֵצִי` : `${h} וְ־${m} דַּקּוֹת`))
    .replace(/(\d+)\s*×\s*(\d+)/g, (_, a, b) => `${a} כָּפוּל ${b}`)
    .replace(/(\d+)\s*:\s*(\d+)/g, (_, a, b) => `${a} חֶלְקֵי ${b}`)
    .replace(/(\d+)\s*\+\s*(\d+)/g, (_, a, b) => `${a} וְעוֹד ${b}`)
    .replace(/(\d+)\s*[−-]\s*(\d+)/g, (_, a, b) => `${a} פָּחוֹת ${b}`)
    .replace(/(\d)\s*=\s*(\d)/g, '$1 שָׁוֶה $2')
    .replace(/(\d),(\d{3})\b/g, '$1$2')
    .replace(/\s+[—–]\s+/g, ' — ')
    .replace(/\s+/g, ' ')
    .trim()
}

const vowelOf = (w: string) => {
  let i = 1
  while (i < w.length && /[\u05BC\u05C1\u05C2]/.test(w[i])) i++
  return w[i]
}

/** Attach a one-letter prefix (ל, ב, מ, ו) to a word with the vowel Hebrew grammar asks for. */
export function attachPrefix(prefix: string, word: string): string {
  return fuse(prefix, word).normalize('NFC')
}

function fuse(prefix: string, word: string): string {
  const letter = prefix[0]
  if (letter === 'ו') return withVav(word)
  if (letter === 'מ') return /[אהחער]/.test(word[0]) ? `מֵ${word}` : `מִ${word}`
  const base = letter === 'ב' ? 'בּ' : letter
  const v = vowelOf(word)
  if (v === '\u05B0') return `${base}\u05B4${word}`
  if (v === '\u05B2') return `${base}\u05B7${word}`
  if (v === '\u05B1') return `${base}\u05B6${word}`
  return `${base}\u05B0${word}`
}

/** The words of a number, with an optional fused prefix (לְ־10 → לְעֶשֶׂר). */
export function numberWords(n: number, prefix = ''): string[] {
  const words = numberToWords(n).split(' ')
  if (prefix) words[0] = attachPrefix(prefix, words[0])
  return words.map((w) => w.normalize('NFC'))
}

const TOKEN = /(?<![^\s"(])([ובלמ][\u05B0-\u05BC\u05C1\u05C2]*)־(\d+)|(\d+)|([^\s\d]+)/g

/** Split text into sentences of words. Prefixed numbers are fused; maqaf joins stay inside a word. */
export function toSentences(text: string): Sentence[] {
  const out: Sentence[] = []
  let cur: Sentence = []
  const flush = () => {
    if (cur.length) out.push(cur)
    cur = []
  }
  for (const m of normalizeMath(text).matchAll(TOKEN)) {
    const [, prefix, prefixedNum, num, raw] = m
    if (prefixedNum || num) {
      // Trailing punctuation sits in the next raw token ("10." splits as "10" + "."), handled below.
      for (const w of numberWords(Number(prefixedNum ?? num), prefix ?? '')) cur.push({ say: w, key: w, num: true, pause: false })
      continue
    }
    const key = /\p{L}/u.test(raw) ? wordKey(raw) : ''
    const end = /[.!?:;]["״)]*$/.test(raw) || raw === '—'
    if (key) cur.push({ say: raw, key, num: false, pause: /[,—–]$/.test(raw) })
    else if (cur.length) {
      // Punctuation after a number ("10," "10?") arrives as its own token.
      const last = cur[cur.length - 1]
      if (raw !== '—') last.say += raw
      if (/[,—–]/.test(raw)) last.pause = true
    }
    if (end) flush()
  }
  flush()
  return out
}

/** Contiguous runs of non-number words: the phrases recorded as whole clips. */
export function textRuns(s: Sentence): Word[][] {
  const runs: Word[][] = []
  let run: Word[] = []
  for (const w of s) {
    if (w.num) {
      if (run.length) runs.push(run)
      run = []
    } else run.push(w)
  }
  if (run.length) runs.push(run)
  return runs
}

export const runKey = (ws: Word[]) => ws.map((w) => w.key).join(' ')
export const runSay = (ws: Word[]) => ws.map((w) => w.say).join(' ').replace(/[,—–\s]+$/, '')

/** Every clip needed to say any number 0–1000, with or without a prefix. */
export function numberPhrases(): string[] {
  const set = new Set<string>()
  for (let n = 0; n <= 1000; n++) {
    const words = numberWords(n)
    if (n <= 100 || n % 100 === 0) set.add(words.join(' '))
    // Hundreds + remainder: "מָאתַיִם" + "חֲמִשִּׁים וְשָׁלוֹשׁ" or "מֵאָה" + "וְחָמֵשׁ".
    if (n > 100 && n % 100) {
      const h = numberWords(n - (n % 100)).length
      set.add(words.slice(h).join(' '))
    }
    for (const w of words) set.add(w)
    for (const p of ['ל', 'ב', 'מ', 'ו']) set.add(numberWords(n, p)[0])
  }
  return [...set]
}

export interface Piece {
  key: string
  /** Breath before this piece: 'sentence' between sentences, 'comma' at a comma. */
  gap: 'none' | 'comma' | 'sentence'
}

/**
 * Cover a sentence with the fewest known clips. Returns null when some word has
 * no clip, so the caller can fall back to device speech for that sentence.
 */
export function coverSentence(s: Sentence, has: (key: string) => boolean): Piece[] | null {
  const n = s.length
  const best: (number | undefined)[] = Array(n + 1)
  const from: number[] = Array(n + 1)
  best[0] = 0
  for (let i = 0; i < n; i++) {
    if (best[i] === undefined) continue
    let key = ''
    for (let j = i + 1; j <= n; j++) {
      key = key ? `${key} ${s[j - 1].key}` : s[j - 1].key
      // A clip may span a comma (its prosody includes the breath) but never a sentence end.
      if (has(key) && (best[j] === undefined || best[i]! + 1 < best[j]!)) {
        best[j] = best[i]! + 1
        from[j] = i
      }
    }
  }
  if (best[n] === undefined) return null
  const pieces: Piece[] = []
  for (let j = n; j > 0; j = from[j]) {
    const i = from[j]
    pieces.unshift({ key: runKey(s.slice(i, j)), gap: i > 0 && s[i - 1].pause ? 'comma' : 'none' })
  }
  return pieces
}
