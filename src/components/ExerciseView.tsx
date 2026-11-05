import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../app/AppContext'
import { g, join, type Txt } from '../content/he/text'
import { analyzeAnswer, mirroredTip, type ErrorAnalysis, type ErrorType } from '../engine/errorAnalysis'
import type { InputMode } from '../engine/stats'
import { answerSlots, blankCount, joinDigits, MAX_DIGITS } from '../exercises/answerFormat'
import { checkAnswer } from '../exercises/registry'
import type { Exercise, Token, Visual } from '../exercises/types'
import { choicesForSpeech, speak, speakQuestion, stop, tokensForSpeech } from '../speech/speech'
import { Character, type CharacterKind, type Mood } from './Characters'
import { FitBox } from './FitBox'
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
const SHOW_ME = g('תַּרְאִי לִי אֵיךְ', 'תַּרְאֵה לִי אֵיךְ')
const LETS_TRY = g('אֲנַסֶּה!', 'אֲנַסֶּה!')
const CHECK = 'בְּדִיקָה'
const NEXT = 'מַמְשִׁיכִים'
const TEST_OK = 'נָכוֹן! ✓'
const TEST_NEUTRAL = 'קִבַּלְתִּי! מַמְשִׁיכִים.'

const emptyBoxes = (ex: Exercise) => answerSlots(ex).map((k) => Array.from({ length: k }, emptyBox))

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
  const [boxes, setBoxes] = useState<BoxValue[][]>(() => emptyBoxes(ex))
  const [active, setActive] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('answer')
  const [attempts, setAttempts] = useState(0)
  const [analysis, setAnalysis] = useState<ErrorAnalysis | null>(null)
  const [message, setMessage] = useState<Txt | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [mood, setMood] = useState<Mood>('idle')
  const firstError = useRef<ErrorType | undefined>(undefined)
  const sawMirror = useRef(false)
  const usedInput = useRef<InputMode>(ex.answerType === 'choice' ? 'choice' : input)
  const started = useRef(0)

  useEffect(() => {
    started.current = Date.now()
  }, [])

  const values = useMemo(
    () => (input === 'keys' ? typed : boxes.map((bs) => joinDigits(bs.map((b) => b.digit)))),
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
    void speakQuestion(instructionSpeech)
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
    setBoxes(emptyBoxes(ex))
    setChoice(null)
    setActive(0)
  }

  const submit = (choiceValue?: number) => {
    setHintOpen(false)
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

  const showSolution = () => {
    setHintOpen(false)
    setAttempts((x) => Math.max(x, 2))
    setAnalysis({ type: 'other', message: ex.hint, visual: ex.hintVisual })
    say(join(SOLVE_TOGETHER, ex.hint, ex.answerType === 'number' ? `הַתְּשׁוּבָה הִיא ${ex.answers.join(' וְ־')}.` : ''))
    setPhase('solution')
  }

  const dontKnow = () => {
    setMood('think')
    if (!showHint) {
      setShowHint(true)
      setHintOpen(true)
      setAnalysis(ex.hintVisual ? { type: 'other', message: ex.hint, visual: ex.hintVisual } : null)
      say(ex.hint)
      return
    }
    showSolution()
  }

  const sameAsMain = (v: Visual | undefined) => !!v && !!ex.visual && JSON.stringify(v) === JSON.stringify(ex.visual)
  const extraVisual = phase === 'right' ? undefined : (analysis?.visual ?? (showHint ? ex.hintVisual : undefined))

  const onDigit = (d: number) => {
    setTyped((prev) => prev.map((v, i) => (i === active && v.length < MAX_DIGITS ? v + d : v)))
  }
  const onBack = () => setTyped((prev) => prev.map((v, i) => (i === active ? v.slice(0, -1) : v)))

  const answering = phase === 'answer'
  const correctChoice = ex.answerType === 'choice' && (phase === 'solution' || phase === 'right') ? ex.answers[0] : null
  const choiceLabel = ex.answerType === 'choice' && ex.tokens?.some((tk) => tk.t === 'blank') ? ex.choices?.find((c) => c.value === (correctChoice ?? choice))?.label : undefined
  const sheetOpen = !answering || hintOpen
  const hasQuestionBlank = !!ex.tokens?.some((tk) => tk.t === 'blank')

  return (
    <div className={`exercise ${ex.story ? 'has-story' : ''} ${ex.visual ? 'has-visual' : ''}`}>
      <section className="ex-question">
        <div className="ex-head">
          <span className="ex-guide">
            <Character kind={guide} mood={mood} size={52} />
          </span>
          <div className="instruction-wrap">
            {ex.story && <p className="story">{t(ex.story)}</p>}
            <h2 className="instruction" id={`ins-${ex.id}`}>
              {t(ex.instruction)}
            </h2>
          </div>
          <SpeakButton text={instructionSpeech} />
        </div>

        {ex.visual && (
          <FitBox className="visual-card ex-visual">
            <VisualView v={ex.visual} />
          </FitBox>
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
        {ex.answerType === 'number' && !hasQuestionBlank && (
          <div className="equation-wrap">
            <TokenRow tokens={[{ t: 'blank', i: 0 }]} values={values} active={answering ? 0 : -1} onSelect={() => {}} reveal={phase === 'solution' ? ex.answers : undefined} />
          </div>
        )}
      </section>

      <section className={`ex-answer ${ex.answerType === 'choice' ? (ex.choices!.some((c) => c.visual) ? 'choice-visual' : 'choice') : input}`} aria-hidden={sheetOpen && !hintOpen}>
        {ex.answerType === 'choice' && (
          <div className={`choices ${ex.choices!.some((c) => c.visual) ? 'visual' : ''} n${ex.choices!.length}`}>
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
                {c.visual ? (
                  <FitBox className="choice-fit">
                    <ChoiceVisual v={c.visual} />
                  </FitBox>
                ) : <span className="choice-label">{c.label}</span>}
              </button>
            ))}
          </div>
        )}

        {ex.answerType === 'number' &&
          (input === 'hand' ? (
            <HandwritingPad
              key={`${active}-${attempts}`}
              boxes={boxes[active]}
              onBoxChange={(k, v) => setBoxes((prev) => prev.map((bs, i) => (i === active ? bs.map((b, j) => (j === k ? v : b)) : bs)))}
              onAdd={boxes[active].length < MAX_DIGITS ? () => setBoxes((prev) => prev.map((bs, i) => (i === active ? [...bs, emptyBox()] : bs))) : undefined}
              disabled={!answering}
            />
          ) : (
            <Keypad onDigit={onDigit} onBack={onBack} disabled={!answering} />
          ))}
      </section>

      <div className="ex-bar">
        {ex.answerType === 'number' && (
          <button
            type="button"
            className="tool"
            disabled={!answering}
            onClick={() => setInput(input === 'hand' ? 'keys' : 'hand')}
            aria-label={input === 'hand' ? 'מעבר למקלדת' : 'מעבר לכתב יד'}
          >
            {input === 'hand' ? '🔢' : '✏️'}
          </button>
        )}
        {nBlanks > 1 && (
          <button type="button" className="tool" disabled={!answering} onClick={() => setActive((active + 1) % nBlanks)} aria-label="למשבצת הבאה">
            ⇄
          </button>
        )}
        {ex.answerType === 'number' ? (
          <button type="button" className="btn primary big check" disabled={!answering || !complete} onClick={() => submit()}>
            ✔ {CHECK}
          </button>
        ) : (
          <span className="bar-spacer" />
        )}
        {mode === 'practice' && (
          <button type="button" className="tool dont-know" disabled={!answering} onClick={dontKnow} aria-label={t(DONT_KNOW)}>
            <span aria-hidden>🤔</span>
            <small>{t(DONT_KNOW)}</small>
          </button>
        )}
      </div>

      <AnimatePresence>
        {sheetOpen && message && (
          <motion.div
            key="sheet"
            className={`sheet ${phase === 'right' || (phase === 'done' && message === TEST_OK) ? 'good' : phase === 'done' || hintOpen ? 'neutral' : 'try'}`}
            role="status"
            aria-live="polite"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            <div className="sheet-body">
              <motion.p className="sheet-msg" key={String(phase) + attempts} animate={phase === 'wrong' ? { x: [0, -6, 6, -3, 0] } : {}}>
                <span className="bubble-icon" aria-hidden>
                  {phase === 'right' ? '🌟' : phase === 'done' ? '👍' : '💡'}
                </span>
                <span>{t(message)}</span>
              </motion.p>
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
            <div className="sheet-actions">
              {hintOpen && answering && (
                <>
                  <button type="button" className="btn ghost big" onClick={showSolution}>
                    🤔 {t(SHOW_ME)}
                  </button>
                  <button type="button" className="btn primary big" onClick={() => setHintOpen(false)} autoFocus>
                    ✏️ {t(LETS_TRY)}
                  </button>
                </>
              )}
              {phase === 'wrong' && (
                <button type="button" className="btn primary big" onClick={retry} autoFocus>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
