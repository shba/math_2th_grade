import type { Txt } from '../content/he/text'

export type TopicId =
  | 'add-sub-20'
  | 'numbers-1000'
  | 'add-sub-100'
  | 'word-problems'
  | 'mult-div'
  | 'line-fractions'
  | 'data'
  | 'measurement'
  | 'geometry'

export type Op = '+' | '-' | '×' | ':'

export type Token =
  | { t: 'n'; v: number }
  | { t: 'op'; v: Op | '=' | '<' | '>' | ',' | '…' }
  | { t: 'blank'; i: number }
  | { t: 'w'; v: string }

export type ItemIcon = string

export type SolidId = 'cube' | 'box' | 'cylinder' | 'pyramid' | 'cone' | 'sphere'

export type Visual =
  | { kind: 'items'; icon: ItemIcon; count: number; slots?: number; crossed?: number; added?: number; pairs?: boolean }
  | { kind: 'blocks'; hundreds: number; tens: number; ones: number }
  | { kind: 'column'; a: number; b: number; op: '+' | '-' }
  | { kind: 'groups'; groups: number; each: number; icon: ItemIcon }
  | { kind: 'numberline'; min: number; max: number; step: number; labelEvery: number; arrowAt?: number; jumps?: number[] }
  | { kind: 'fraction'; shape: 'circle' | 'rect'; parts: number; shaded: number }
  | { kind: 'clock'; h: number; m: number }
  | { kind: 'bars'; labels: string[]; icons: ItemIcon[]; values: number[] }
  | { kind: 'grid'; w: number; h: number }
  | { kind: 'ruler'; length: number; icon: ItemIcon }
  | { kind: 'solid'; solid: SolidId }
  | { kind: 'shape'; points: [number, number][]; axis?: 'v' | 'h'; color?: string }
  | { kind: 'prices'; items: { icon: ItemIcon; price: number; name: string }[] }
  | { kind: 'chain'; values: (number | null)[]; op: Op; step: number }
  | { kind: 'balance'; left: ItemIcon; right: ItemIcon; heavier: 'left' | 'right' }

export interface Choice {
  label: string
  value: number
  visual?: Visual
  speak?: string
}

export type InstructionIcon = 'pencil' | 'eye' | 'count' | 'choose' | 'puzzle' | 'story' | 'clock' | 'ruler'

export interface ExerciseMeta {
  a?: number
  b?: number
  op?: Op
  result?: number
  unknown?: 'result' | 'a' | 'b'
}

export interface Exercise {
  id: string
  topicId: TopicId
  skillId: string
  level: number
  difficulty: Difficulty
  /** One fully vocalized instruction. */
  instruction: Txt
  /** Optional text to read aloud instead of the instruction (e.g. a word problem). */
  story?: Txt
  icon: InstructionIcon
  tokens?: Token[]
  visual?: Visual
  answerType: 'number' | 'choice'
  /** Expected value for each blank, or the correct choice value. */
  answers: number[]
  choices?: Choice[]
  /** Open-ended exercises accept any values that satisfy this check. */
  validate?: (vals: number[]) => boolean
  meta?: ExerciseMeta
  hint: Txt
  hintVisual?: Visual
}

export type Difficulty = 1 | 2 | 3

export type GeneratorFn = (difficulty: Difficulty, rng: Rng) => Omit<Exercise, 'id' | 'topicId' | 'skillId' | 'level' | 'difficulty'>

export interface Rng {
  next(): number
  int(min: number, max: number): number
  pick<T>(arr: readonly T[]): T
  shuffle<T>(arr: readonly T[]): T[]
}
