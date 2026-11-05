import { g, join, type Txt } from '../content/he/text'
import { compute, reverseDigits } from '../exercises/helpers'
import type { Exercise, Op, Visual } from '../exercises/types'

export type ErrorType =
  | 'reversed-digits'
  | 'off-by-one'
  | 'wrong-operation'
  | 'no-regroup'
  | 'place-value'
  | 'table-neighbor'
  | 'mirrored-digit'
  | 'other'

export interface ErrorAnalysis {
  type: ErrorType
  message: Txt
  visual?: Visual
  /** Digits that the handwriting recognizer saw mirrored, for the tracing demo. */
  mirrored?: number[]
}

export const ERROR_LABELS: Record<ErrorType, string> = {
  'reversed-digits': 'ספרות הפוכות (21 במקום 12)',
  'off-by-one': 'טעות של אחד',
  'wrong-operation': 'פעולה לא נכונה (חיבור במקום חיסור)',
  'no-regroup': 'שכחת המרה / פריטה',
  'place-value': 'בלבול עשרות ויחידות',
  'table-neighbor': 'תרגיל שכן בלוח הכפל',
  'mirrored-digit': 'ספרה בכתב ראי',
  other: 'אחר',
}

const wrote = g('כָּתַבְתְּ', 'כָּתַבְתָּ')
const tryAgain = g('נַסִּי שׁוּב', 'נַסֵּה שׁוּב')
const notice = g('שִׂימִי לֵב', 'שִׂים לֵב')
const readAgain = g('קִרְאִי שׁוּב אֶת הַשְּׁאֵלָה', 'קְרָא שׁוּב אֶת הַשְּׁאֵלָה')

const OP_WORD: Record<Op, string> = { '+': 'וְעוֹד (+)', '-': 'פָּחוֹת (−)', '×': 'כָּפוּל (×)', ':': 'חֶלְקֵי (:)' }

const blocksOf = (x: number): Visual => ({ kind: 'blocks', hundreds: Math.floor(x / 100), tens: Math.floor(x / 10) % 10, ones: x % 10 })

/** The value a child gets by applying the opposite operation to the numbers on screen. */
export function wrongOperationValue(ex: Exercise): number | undefined {
  const m = ex.meta
  if (!m || m.a === undefined || m.b === undefined || !m.op) return undefined
  const { a, b, op, result = compute(a, op, b), unknown = 'result' } = m
  if (unknown === 'result') {
    if (op === '+') return Math.abs(a - b)
    if (op === '-') return a + b
    if (op === '×') return a + b
    return a * b
  }
  if (unknown === 'b') {
    if (op === '+') return result + a
    if (op === '-') return a + result
    if (op === '×') return result - a
    return undefined
  }
  if (op === '+') return result + b
  if (op === '-') return result - b
  return undefined
}

/** Column-by-column answers a child gets when forgetting to carry or to borrow. */
export function noRegroupValues(a: number, op: Op, b: number): number[] {
  const [a1, a10, b1, b10] = [a % 10, Math.floor(a / 10), b % 10, Math.floor(b / 10)]
  if (op === '+' && a1 + b1 >= 10) return [(a10 + b10) * 10 + ((a1 + b1) % 10)]
  if (op === '-' && a1 < b1) {
    const out = [(a10 - b10) * 10 + (b1 - a1), (a10 - b10) * 10 + (a1 + 10 - b1)]
    return out.filter((v) => v >= 0)
  }
  return []
}

export function analyzeAnswer(ex: Exercise, given: number[], opts: { mirrored?: number[] } = {}): ErrorAnalysis {
  const mirrored = opts.mirrored?.length ? opts.mirrored : undefined

  if (ex.validate && given.length > 1) {
    const m = ex.tokens?.find((t) => t.t === 'op' && (t.v === '+' || t.v === '-'))
    const o = (m && m.t === 'op' ? m.v : '+') as Op
    const [a, b] = given
    const res = compute(a, o, b)
    const target = ex.tokens?.find((t) => t.t === 'n')
    const goal = target && target.t === 'n' ? target.v : ex.answers[0]
    return {
      type: 'other',
      message: join(`${a} ${o === '+' ? '+' : '−'} ${b} = ${res}, וְלֹא ${goal}.`, tryAgain),
      mirrored,
    }
  }

  const exp = ex.answers[0]
  const got = given[0]
  const m = ex.meta

  if (ex.answerType === 'number' && exp >= 10 && got !== exp && reverseDigits(got) === exp && String(got).length === String(exp).length) {
    return {
      type: 'reversed-digits',
      message: join('כִּמְעַט!', wrote, `${got} — הַסְּפָרוֹת הִתְהַפְּכוּ. בְּמִסְפָּר כּוֹתְבִים מִשְּׂמֹאל לְיָמִין: קֹדֶם אֶת הָעֲשָׂרוֹת, וְאַחַר כָּךְ אֶת הַיְּחִידוֹת.`),
      visual: blocksOf(exp),
      mirrored,
    }
  }

  if (ex.answerType === 'number' && m?.op) {
    const wrong = wrongOperationValue(ex)
    if (wrong !== undefined && got === wrong && wrong !== exp) {
      const unknown = m.unknown ?? 'result'
      let message: Txt
      if (!ex.tokens) message = join(readAgain, '— הַאִם מוֹסִיפִים אוֹ מוֹרִידִים? עַל מָה שׁוֹאֲלִים: עַל הַכֹּל, אוֹ עַל חֵלֶק?')
      else if (m.op === '×') message = join(notice, `— כֶּפֶל הוּא לֹא חִבּוּר. ${m.a} × ${m.b} זֶה ${m.a} קְבוּצוֹת, וּבְכׇל קְבוּצָה ${m.b}.`)
      else if (unknown !== 'result') message = join(notice, `— מְחַפְּשִׂים אֶת הַמִּסְפָּר הֶחָסֵר. כַּמָּה צָרִיךְ כְּדֵי שֶׁהַתַּרְגִּיל יִהְיֶה נָכוֹן?`)
      else message = join(notice, `לַסִּימָן! כָּתוּב ${OP_WORD[m.op]}, אָז ${m.op === '-' ? 'מוֹרִידִים — לֹא מוֹסִיפִים' : 'מוֹסִיפִים — לֹא מוֹרִידִים'}.`)
      const visual: Visual | undefined =
        m.op === '×' && m.a! * m.b! <= 36 ? { kind: 'groups', groups: m.a!, each: m.b!, icon: '⭐' } : undefined
      return { type: 'wrong-operation', message, visual, mirrored }
    }

    if ((m.unknown ?? 'result') === 'result' && (m.op === '+' || m.op === '-') && m.a! >= 10) {
      if (noRegroupValues(m.a!, m.op, m.b!).includes(got)) {
        const message =
          m.op === '+'
            ? join('כִּמְעַט! שָׁכַחְנוּ אֶת הַהֲמָרָה:', `${m.a! % 10} וְעוֹד ${m.b! % 10} יְחִידוֹת זֶה יוֹתֵר מִ־10, אָז 10 יְחִידוֹת הוֹפְכוֹת לַעֲשָׂרָה אַחַת נוֹסֶפֶת.`)
            : join('כִּמְעַט! צָרִיךְ לִפְרֹט:', `אִי אֶפְשָׁר לְהוֹרִיד ${m.b! % 10} יְחִידוֹת מִ־${m.a! % 10}. פּוֹרְטִים עֲשָׂרָה אַחַת לְ־10 יְחִידוֹת, וְאָז יֵשׁ ${(m.a! % 10) + 10} יְחִידוֹת.`)
        return { type: 'no-regroup', message, visual: blocksOf(m.a!), mirrored }
      }
    }

    if (m.op === '×' && (m.unknown ?? 'result') === 'result') {
      const { a = 0, b = 0 } = m
      if ([a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b].includes(got)) {
        return {
          type: 'table-neighbor',
          message: join('כִּמְעַט! זוֹ הַתְּשׁוּבָה שֶׁל תַּרְגִּיל שָׁכֵן בְּלוּחַ הַכֶּפֶל.', g(`סִפְרִי בִּקְפִיצוֹת שֶׁל ${b}.`, `סְפֹר בִּקְפִיצוֹת שֶׁל ${b}.`)),
          visual: a * b <= 36 ? { kind: 'groups', groups: a, each: b, icon: '⭐' } : undefined,
          mirrored,
        }
      }
    }
  }

  if (ex.answerType === 'number' && Math.abs(got - exp) === 1) {
    return {
      type: 'off-by-one',
      message: join(got < exp ? 'כִּמְעַט! חָסֵר רַק 1.' : 'כִּמְעַט! יֵשׁ 1 יוֹתֵר מִדַּי.', g('סִפְרִי שׁוּב לְאַט, אֶחָד אֶחָד.', 'סְפֹר שׁוּב לְאַט, אֶחָד אֶחָד.')),
      visual: ex.hintVisual,
      mirrored,
    }
  }

  if (ex.answerType === 'number' && exp >= 10 && got % 10 === exp % 10 && got !== exp && got < 1000) {
    return {
      type: 'place-value',
      message: join('הַיְּחִידוֹת נְכוֹנוֹת! אֲבָל הָעֲשָׂרוֹת לֹא.', g('סִפְרִי שׁוּב אֶת הָעֲשָׂרוֹת.', 'סְפֹר שׁוּב אֶת הָעֲשָׂרוֹת.')),
      visual: blocksOf(exp),
      mirrored,
    }
  }

  return { type: 'other', message: join('לֹא נוֹרָא!', tryAgain, '—', ex.hint), visual: ex.hintVisual, mirrored }
}

export function mirroredTip(digitsSeen: number[]): ErrorAnalysis {
  const list = [...new Set(digitsSeen)].join(', ')
  return {
    type: 'mirrored-digit',
    message: join('יָפֶה!', notice, `— אֶת הַסִּפְרָה ${list}`, wrote, 'הָפוּךְ, כְּמוֹ בְּמַרְאָה. כָּכָה כּוֹתְבִים אוֹתָהּ:'),
    mirrored: digitsSeen,
  }
}
