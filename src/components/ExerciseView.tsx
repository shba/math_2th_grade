import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../app/AppContext'
import { g, join, type Txt } from '../content/he/text'
import { analyzeAnswer, mirroredTip, type ErrorAnalysis, type ErrorType } from '../engine/errorAnalysis'
import type { InputMode } from '../engine/stats'
import { checkAnswer } from '../exercises/registry'
import type { Exercise, Token, Visual } from '../exercises/types'
import { choicesForSpeech, speak, stop, tokensForSpeech } from '../speech/speech'
import { Character, type CharacterKind, type Mood } from './Characters'
import { emptyBox, HandwritingPad, type BoxValue } from './HandwritingPad'
import { Keypad } from './Keypad'
import { SpeakButton } from './SpeakButton'
import { ChoiceVisual, VisualView } from './Visuals'

export interface ExerciseResult {
  correct: boolean
  attempts: number
  errorType?: ErrorType
  mirrored: boolean
  input: InputMode
  ms: number
}

type Mode = 'practice' | 'test' | 'placement'
type Phase = 'answer' | 'wrong' | 'right' | 'solution' | 'done'

const PRAISE: Txt[] = [
  g('יָפֶה מְאוֹד! חָשַׁבְתְּ בְּסַבְלָנוּת.', 'יָפֶה מְאוֹד! חָשַׁבְתָּ בְּסַבְלָנוּת.'),
  g('כׇּל הַכָּבוֹד! הִתְאַמַּצְתְּ וְהִצְלַחְתְּ.', 'כׇּל הַכָּבוֹד! הִתְאַמַּצְתָּ וְהִצְלַחְתָּ.'),
  g('נָכוֹן! בָּדַקְתְּ הֵיטֵב.', 'נָכוֹן! בָּדַקְתָּ הֵיטֵב.'),
  g('מְצֻיָּן! עָבַדְתְּ צַעַד אַחַר צַעַד.', 'מְצֻיָּן! עָבַדְתָּ צַעַד אַחַר צַעַד.'),
]
const PRAISE_RETRY = g('יֵשׁ! לֹא וִתַּרְתְּ, וְהִצְלַחְתְּ!', 'יֵשׁ! לֹא וִתַּרְתָּ, וְהִצְלַחְתָּ!')
const SOLVE_TOGETHER = g('בּוֹאִי נִפְתֹּר יַחַד.', 'בּוֹא נִפְתֹּר יַחַד.')
const DONT_KNOW = g('לֹא יוֹדַעַת', 'לֹא יוֹדֵעַ')
const CHECK = 'בְּדִיקָה'
const NEXT = 'מַמְשִׁיכִים'
const TEST_OK = 'נָכוֹן! ✓'
const TEST_NEUTRAL = 'קִבַּלְתִּי! מַמְשִׁיכִים.'

const boxCount = (ex: Exercise, i: number) => (ex.validate ? 2 : Math.max(1, String(ex.answers[i] ?? 0).length))

function blankCount(ex: Exercise) {
  if (ex.answerType === 'choice') return 0
  return Math.max(1, ex.tokens?.filter((t) => t.t === 'blank').length ?? 1)
}

function TokenRow({
  tokens,
  values,
  active,
  onSelect,
  reveal,
  choiceLabel,
}: {
  tokens: Token[]
  values: string[]
  active: number
  onSelect: (i: number) => void
  reveal?: number[]
  choiceLabel?: string
}) {
  return (
    <bdi dir="ltr" className="equation" aria-label={tokensForSpeech(tokens)}>
      {tokens.map((t, k) => {
        if (t.t === 'n') return <span key={k} className="num">{t.v}</span>
        if (t.t === 'w') return <span key={k} className="word" dir="rtl">{t.v}</span>
        if (t.t === 'op') return <span key={k} className={`op op-${t.v === '+' ? 'plus' : t.v === '-' ? 'minus' : 'other'}`}>{t.v === '-' ? '−' : t.v}</span>
        const shown = reveal ? String(reveal[t.i]) : choiceLabel ?? values[t.i]
        return (
          <button
            key={k}
            type="button"
            className={`blank ${active === t.i ? 'active' : ''} ${shown ? 'filled' : ''} ${reveal ? 'revealed' : ''}`}
            onClick={() => onSelect(t.i)}
            aria-label={`תשובה ${t.i + 1}${shown ? `: ${shown}` : ''}`}
          >
            {shown || '\u00a0'}
          </button>
        )
      })}
    </bdi>
  )
}

export function ExerciseView({
  exercise,
  mode,
  guide,
  onDone,
  handwritingDefault = true,
}: {
  exercise: Exercise
  mode: Mode
  guide: CharacterKind
  onDone: (r: ExerciseResult) => void
  handwritingDefault?: boolean
}) {
  const { t } = useApp()
  const ex = exercise
  const nBlanks = blankCount(ex)
  const [input, setInput] = useState<'hand' | 'keys'>(handwritingDefault ? 'hand' : 'keys')
  const [typed, setTyped] = useState<string[]>(() => Array(nBlanks).fill(''))
  const [boxes, setBoxes] = useState<BoxValue[][]>(() => Array.from({ length: nBlanks }, (_, i) => Array.from({ length: boxCount(ex, i) }, emptyBox)))
  const [active, setActive] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('answer')
  const [attempts, setAttempts] = useState(0)
  const [analysis, setAnalysis] = useState<ErrorAnalysis | null>(null)
  const [message, setMessage] = useState<Txt | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [mood, setMood] = useState<Mood>('idle')
  const firstError = useRef<ErrorType | undefined>(undefined)
  const sawMirror = useRef(false)
  const usedInput = useRef<InputMode>(ex.answerType === 'choice' ? 'choice' : input)
  const started = useRef(Date.now())

  const values = useMemo(
    () => (input === 'keys' ? typed : boxes.map((bs) => bs.map((b) => (b.digit === null ? '' : String(b.digit))).join(''))),
    [input, typed, boxes],
  )
  const complete = ex.answerType === 'choice' ? choice !== null : values.every((v) => v.length > 0)

  const instructionSpeech = useMemo(() => {
    const parts: string[] = []
    if (ex.story) parts.push(t(ex.story))
    parts.push(t(ex.instruction))
    if (ex.tokens && ex.tokens.length > 1) parts.push(tokensForSpeech(ex.tokens))
    if (ex.choices && ex.choices.every((c) => c.label && !/^\d+$/.test(c.label))) parts.push(choicesForSpeech(ex.choices))
    return parts
  }, [ex, t])

  useEffect(() => {
    void speak(instructionSpeech)
    return () => stop()
  }, [instructionSpeech])

  const say = (m: Txt) => {
    setMessage(m)
    void speak(t(m))
  }

  const finish = (correct: boolean) => {
    onDone({ correct, attempts: attempts + 1, errorType: firstError.current, mirrored: sawMirror.current, input: usedInput.current, ms: Date.now() - started.current })
  }

  const resetInput = () => {
    setTyped(Array(nBlanks).fill(''))
    setBoxes(Array.from({ length: nBlanks }, (_, i) => Array.from({ length: boxCount(ex, i) }, emptyBox)))
    setChoice(null)
    setActive(0)
  }

  const submit = (choiceValue?: number) => {
    const given = ex.answerType === 'choice' ? [choiceValue ?? choice!] : values.map(Number)
    const mirroredDigits = input === 'hand' && ex.answerType === 'number' ? boxes.flat().filter((b) => b.mirrored && b.digit !== null).map((b) => b.digit!) : []
    if (mirroredDigits.length) sawMirror.current = true
    if (ex.answerType === 'number') usedInput.current = input
    const ok = checkAnswer(ex, given)
    const n = attempts + 1
    setAttempts(n)

    if (mode !== 'practice') {
      setMood(ok ? 'cheer' : 'idle')
      if (!ok && !firstError.current) firstError.current = analyzeAnswer(ex, given).type
      setMessage(ok ? TEST_OK : TEST_NEUTRAL)
      setPhase('done')
      setTimeout(() => onDone({ correct: ok, attempts: 1, errorType: firstError.current, mirrored: sawMirror.current, input: usedInput.current, ms: Date.now() - started.current }), 900)
      return
    }

    if (ok) {
      setMood('cheer')
      if (mirroredDigits.length) {
        const tip = mirroredTip(mirroredDigits)
        setAnalysis(tip)
        say(join(n > 1 ? PRAISE_RETRY : PRAISE[Math.floor(Math.random() * PRAISE.length)], tip.message))
      } else {
        setAnalysis(null)
        say(n > 1 ? PRAISE_RETRY : PRAISE[Math.floor(Math.random() * PRAISE.length)])
      }
      setPhase('right')
      return
    }

    const a = analyzeAnswer(ex, given, { mirrored: mirroredDigits })
    if (!firstError.current) firstError.current = a.type
    setMood('think')
    if (n === 1) {
      setAnalysis(a)
      say(a.message)
      setPhase('wrong')
    } else if (n === 2) {
      setAnalysis({ ...a, visual: ex.hintVisual ?? a.visual })
      setShowHint(true)
      say(join(a.type === 'other' ? '' : a.message, ex.hint))
      setPhase('wrong')
    } else {
      setAnalysis({ type: a.type, message: ex.hint, visual: ex.hintVisual ?? a.visual })
      say(join(SOLVE_TOGETHER, ex.hint, ex.answerType === 'number' ? `הַתְּשׁוּבָה הִיא ${ex.answers.join(' וְ־')}.` : ''))
      setPhase('solution')
    }
  }

  const retry = () => {
    stop()
    resetInput()
    setMessage(null)
    setMood('idle')
    setPhase('answer')
  }

  const dontKnow = () => {
    setMood('think')
    if (!showHint) {
      setShowHint(true)
      say(ex.hint)
      return
    }
    setAttempts((x) => Math.max(x, 2))
    setAnalysis({ type: 'other', message: ex.hint, visual: ex.hintVisual })
    say(join(SOLVE_TOGETHER, ex.hint, ex.answerType === 'number' ? `הַתְּשׁוּבָה הִיא ${ex.answers.join(' וְ־')}.` : ''))
    setPhase('solution')
  }

  const sameAsMain = (v: Visual | undefined) => !!v && !!ex.visual && JSON.stringify(v) === JSON.stringify(ex.visual)
  const extraVisual = phase === 'right' ? undefined : (analysis?.visual ?? (showHint ? ex.hintVisual : undefined))

  const onDigit = (d: number) => {
    setTyped((prev) => prev.map((v, i) => (i === active && v.length < 3 ? v + d : v)))
  }
  const onBack = () => setTyped((prev) => prev.map((v, i) => (i === active ? v.slice(0, -1) : v)))

  const answering = phase === 'answer'
  const correctChoice = ex.answerType === 'choice' && (phase === 'solution' || phase === 'right') ? ex.answers[0] : null
  const choiceLabel = ex.answerType === 'choice' && ex.tokens?.some((tk) => tk.t === 'blank') ? ex.choices?.find((c) => c.value === (correctChoice ?? choice))?.label : undefined

  return (
    <div className="exercise">
      <div className="ex-head">
        <Character kind={guide} mood={mood} size={84} />
        <div className="instruction-wrap">
          {ex.story && <p className="story">{t(ex.story)}</p>}
          <h2 className="instruction" id={`ins-${ex.id}`}>
            {t(ex.instruction)}
          </h2>
        </div>
        <SpeakButton text={instructionSpeech} />
      </div>

      {ex.visual && (
        <div className="visual-card">
          <VisualView v={ex.visual} />
        </div>
      )}

      {ex.tokens && ex.tokens.length > 0 && (
        <div className="equation-wrap">
          <TokenRow
            tokens={ex.tokens}
            values={values}
            active={answering ? active : -1}
            onSelect={(i) => answering && setActive(i)}
            reveal={phase === 'solution' && ex.answerType === 'number' ? ex.answers : undefined}
            choiceLabel={choiceLabel}
          />
        </div>
      )}
      {!ex.tokens && ex.answerType === 'number' && (
        <div className="equation-wrap">
          <TokenRow tokens={[{ t: 'blank', i: 0 }]} values={values} active={answering ? 0 : -1} onSelect={() => {}} reveal={phase === 'solution' ? ex.answers : undefined} />
        </div>
      )}

      <div className="feedback" aria-live="polite">
        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              key={String(phase) + attempts}
              className={`bubble ${phase === 'right' || (phase === 'done' && message === TEST_OK) ? 'good' : phase === 'done' ? 'neutral' : 'try'}`}
              initial={{ opacity: 0, y: 8 }}
              animate={phase === 'wrong' ? { opacity: 1, y: 0, x: [0, -6, 6, -3, 0] } : { opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span className="bubble-icon" aria-hidden>
                {phase === 'right' ? '🌟' : phase === 'done' ? '👍' : '💡'}
              </span>
              <span>{t(message)}</span>
            </motion.div>
          )}
        </AnimatePresence>
        {analysis?.mirrored && analysis.mirrored.length > 0 && (
          <div className="mirror-demo" aria-hidden>
            {[...new Set(analysis.mirrored)].map((d) => (
              <span key={d} className="mirror-pair">
                <span className="mirrored-digit">{d}</span>
                <span className="arrow">→</span>
                <span className="trace-digit">{d}</span>
              </span>
            ))}
          </div>
        )}
        {extraVisual && !sameAsMain(extraVisual) && (
          <div className="visual-card hint-visual">
            <VisualView v={extraVisual} />
          </div>
        )}
      </div>

      {ex.answerType === 'choice' && (
        <div className={`choices ${ex.choices!.some((c) => c.visual) ? 'visual' : ''}`}>
          {ex.choices!.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`choice ${choice === c.value ? 'picked' : ''} ${correctChoice === c.value ? 'correct' : ''}`}
              disabled={!answering}
              onClick={() => {
                setChoice(c.value)
                submit(c.value)
              }}
              aria-label={c.visual ? `אפשרות ${ex.choices!.indexOf(c) + 1}` : undefined}
            >
              {c.visual ? <ChoiceVisual v={c.visual} /> : <span className="choice-label">{c.label}</span>}
            </button>
          ))}
        </div>
      )}

      {ex.answerType === 'number' && answering && (
        <div className="answer-area">
          {input === 'hand' ? (
            <HandwritingPad boxes={boxes[active]} onChange={(b) => setBoxes((prev) => prev.map((x, i) => (i === active ? b : x)))} />
          ) : (
            <Keypad onDigit={onDigit} onBack={onBack} />
          )}
          <div className="answer-tools">
            <button type="button" className="tool" onClick={() => setInput(input === 'hand' ? 'keys' : 'hand')} aria-label={input === 'hand' ? 'מעבר למקלדת' : 'מעבר לכתב יד'}>
              {input === 'hand' ? '🔢' : '✏️'}
            </button>
            {nBlanks > 1 && (
              <button type="button" className="tool" onClick={() => setActive((active + 1) % nBlanks)} aria-label="למשבצת הבאה">
                ⇄
              </button>
            )}
            {mode === 'practice' && (
              <button type="button" className="tool wide" onClick={dontKnow}>
                🤔 {t(DONT_KNOW)}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="actions">
        {answering && ex.answerType === 'number' && (
          <button type="button" className="btn primary big" disabled={!complete} onClick={() => submit()}>
            ✔ {CHECK}
          </button>
        )}
        {answering && ex.answerType === 'choice' && mode === 'practice' && (
          <button type="button" className="tool wide" onClick={dontKnow}>
            🤔 {t(DONT_KNOW)}
          </button>
        )}
        {phase === 'wrong' && (
          <button type="button" className="btn primary big" onClick={retry}>
            ↻ {t(g('נַסִּי שׁוּב', 'נַסֵּה שׁוּב'))}
          </button>
        )}
        {(phase === 'right' || phase === 'solution') && (
          <button
            type="button"
            className="btn primary big"
            onClick={() => {
              stop()
              finish(phase === 'right' && attempts === 1)
            }}
            autoFocus
          >
            {NEXT} ←
          </button>
        )}
      </div>
    </div>
  )
}
