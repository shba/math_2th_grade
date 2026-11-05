// Collects every phrase the app can say and writes speech/phrases.json.
// scripts/generate_speech.py then records one clip per phrase.
//
//   npm run speech:collect
//
// Phrases come from three places:
//  1. Every vocalized string literal in src/ (template literals are split at ${…}),
//  2. Exercises, hints, feedback and lessons generated for many seeds, both genders,
//  3. Number fragments for 0–1000.
// Numbers are never baked into a phrase: the player stitches number clips in.

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join as joinPath, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hasNikud, tx, type Gender, type Txt } from '../src/content/he/text'
import { analyzeAnswer, mirroredTip, noRegroupValues, wrongOperationValue } from '../src/engine/errorAnalysis'
import { reverseDigits } from '../src/exercises/helpers'
import { SKILLS } from '../src/exercises/registry'
import { createRng } from '../src/exercises/rng'
import type { Difficulty, Exercise } from '../src/exercises/types'
import { LESSONS } from '../src/lessons/lessons'
import { tokensForSpeech } from '../src/speech/phrasing'
import { numberPhrases, runKey, runSay, textRuns, toSentences } from '../src/speech/speechText'

const root = joinPath(dirname(fileURLToPath(import.meta.url)), '..')
const phrases = new Map<string, string>()

function addRuns(text: string) {
  for (const s of toSentences(text)) {
    for (const run of textRuns(s)) {
      const key = runKey(run)
      if (key && !phrases.has(key)) phrases.set(key, runSay(run))
    }
  }
}

const GENDERS: Gender[] = ['f', 'm']
const addTxt = (t: Txt | undefined) => {
  if (t !== undefined) for (const gd of GENDERS) addRuns(tx(t, gd))
}

// 2. Generated content.
const SEEDS = 400
for (const [skill, gen] of Object.entries(SKILLS)) {
  for (const d of [1, 2, 3] as Difficulty[]) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rng = createRng(seed * 7919 + d)
      const ex = { ...gen(d, rng), id: 'x', topicId: 'add-sub-20', skillId: skill, level: 1, difficulty: d } as Exercise
      addTxt(ex.story)
      addTxt(ex.instruction)
      addTxt(ex.hint)
      if (ex.tokens) addRuns(tokensForSpeech(ex.tokens))
      // Choices are read as "X, אוֹ Y, אוֹ Z": one clip per option, never the whole list.
      if (ex.choices) for (const c of ex.choices) for (const s of [c.speak ?? c.label]) if (s) [s, `אוֹ ${s}`].forEach(addRuns)
      for (const given of wrongAnswers(ex)) addTxt(analyzeAnswer(ex, given).message)
    }
  }
}
for (const digits of [[2], [3, 7], [4, 5, 9], [1, 2, 6]]) addTxt(mirroredTip(digits).message)
for (const slides of Object.values(LESSONS)) for (const s of slides) {
  addTxt(s.text)
  if (s.tokens) addRuns(tokensForSpeech(s.tokens))
}

function wrongAnswers(ex: Exercise): number[][] {
  if (ex.validate) return [[3, 4], [10, 2]]
  const exp = ex.answers[0]
  const out = [exp + 1, exp - 1, exp + 10, reverseDigits(exp), exp + 7]
  const w = wrongOperationValue(ex)
  if (w !== undefined) out.push(w)
  const m = ex.meta
  if (m?.op && (m.op === '+' || m.op === '-') && m.a !== undefined && m.b !== undefined) out.push(...noRegroupValues(m.a, m.op, m.b))
  if (m?.op === '×' && m.a && m.b) out.push(m.a * (m.b + 1))
  return out.filter((v) => v >= 0 && v !== exp).map((v) => [v])
}

// 1. Vocalized literals anywhere in the UI.
function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = joinPath(dir, name)
    if (statSync(p).isDirectory()) {
      if (name !== 'handwriting') yield* sourceFiles(p)
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) yield p
  }
}

/** String and template literal bodies; templates are returned as their static pieces. */
function literals(src: string): string[] {
  const out: string[] = []
  let i = 0
  const readTemplate = (): string[] => {
    const pieces: string[] = []
    let cur = ''
    i++
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') {
        cur += src[i + 1]
        i += 2
      } else if (src[i] === '$' && src[i + 1] === '{') {
        pieces.push(cur)
        cur = ''
        i += 2
        let depth = 1
        while (i < src.length && depth) {
          const c = src[i]
          if (c === '`') pieces.push(...readTemplate())
          else if (c === "'" || c === '"') out.push(readQuoted(c))
          else {
            if (c === '{') depth++
            if (c === '}') depth--
          }
          i++
        }
      } else cur += src[i++]
    }
    pieces.push(cur)
    return pieces
  }
  const readQuoted = (q: string): string => {
    let s = ''
    i++
    while (i < src.length && src[i] !== q && src[i] !== '\n') {
      if (src[i] === '\\') {
        s += src[i + 1]
        i += 2
      } else s += src[i++]
    }
    return s
  }
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') while (i < src.length && src[i] !== '\n') i++
    else if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i + 2) + 2
      if (i < 2) break
    } else if (c === '`') {
      out.push(...readTemplate())
      i++
    } else if (c === "'" || c === '"') {
      out.push(readQuoted(c))
      i++
    } else i++
  }
  return out
}

const sources = [...sourceFiles(joinPath(root, 'src'))].sort()
for (const file of sources) {
  for (const lit of literals(readFileSync(file, 'utf8'))) {
    if (!hasNikud(lit)) continue
    // A prefix right before an interpolation (…לְ־${n}) belongs to the number, not to this piece.
    addRuns(lit.replace(/(^|\s)[ובלמ][\u05B0-\u05BC\u05C1\u05C2]*־$/, '$1'))
  }
}

// 3. Numbers.
for (const p of numberPhrases()) if (!phrases.has(p)) phrases.set(p, p)

const list = [...phrases].map(([key, say]) => ({ key, say })).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
const outFile = joinPath(root, 'speech', 'phrases.json')
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(list, null, 0).replace(/\},\{/g, '},\n{') + '\n')
console.log(`${list.length} phrases from ${sources.length} files → ${relative(root, outFile)}`)
