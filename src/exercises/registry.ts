import { topicById } from '../curriculum/topics'
import * as t1 from './gen/t1-add-sub-20'
import * as t2 from './gen/t2-numbers-1000'
import * as t3 from './gen/t3-add-sub-100'
import * as t4 from './gen/t4-word-problems'
import * as t5 from './gen/t5-mult-div'
import * as t6 from './gen/t6-line-fractions'
import * as t7 from './gen/t7-data'
import * as t8 from './gen/t8-measurement'
import * as t9 from './gen/t9-geometry'
import type { Difficulty, Exercise, GeneratorFn, Rng, TopicId } from './types'

export const SKILLS: Record<string, GeneratorFn> = {
  add10: t1.add10,
  sub10: t1.sub10,
  add20: t1.add20,
  sub20: t1.sub20,
  missing: t1.missing,
  decompose: t1.decompose,
  howManyMissing: t1.howManyMissing,
  chain: t1.chain,
  writeExercise: t1.writeExercise,
  placeValue: t2.placeValue,
  placeValue3: t2.placeValue3,
  tensOnes: t2.tensOnes,
  neighbors: t2.neighbors,
  sequence: t2.sequence,
  compare: t2.compare,
  evenOdd: t2.evenOdd,
  hundreds: t2.hundreds,
  gimatria: t2.gimatria,
  tens: t3.tens,
  addSubNoRegroup: t3.addSubNoRegroup,
  addSubRegroup: t3.addSubRegroup,
  twoDigit: t3.twoDigit,
  column: t3.column,
  oneStep: t4.oneStep,
  compareStory: t4.compareStory,
  twoStep: t4.twoStep,
  prices: t4.prices,
  groups: t5.groups,
  repeatedAdd: t5.repeatedAdd,
  table6: t5.table6,
  table10: t5.table10,
  legs: t5.legs,
  division: t5.division,
  money: t5.money,
  numberLine: t6.numberLine,
  jumps: t6.jumps,
  fractionShape: t6.fractionShape,
  fractionQty: t6.fractionQty,
  bars: t7.bars,
  ruler: t8.ruler,
  area: t8.area,
  weight: t8.weight,
  clock: t8.clock,
  duration: t8.duration,
  solidName: t9.solidName,
  solidParts: t9.solidParts,
  symmetry: t9.symmetry,
  mirrorShift: t9.mirrorShift,
}

let counter = 0

export function clampDifficulty(topicId: TopicId, level: number, d: number): Difficulty {
  const def = topicById(topicId).levels[level - 1]
  const lo = def?.dMin ?? 1
  const hi = def?.dMax ?? 3
  return Math.max(lo, Math.min(hi, d)) as Difficulty
}

export function generateExercise(
  topicId: TopicId,
  level: number,
  difficulty: number,
  rng: Rng,
  opts: { skillId?: string; avoid?: Exercise } = {},
): Exercise {
  const def = topicById(topicId).levels[level - 1]
  const d = clampDifficulty(topicId, level, difficulty)
  for (let attempt = 0; attempt < 6; attempt++) {
    const skillId = opts.skillId ?? rng.pick(def.skills)
    const ex: Exercise = { ...SKILLS[skillId](d, rng), id: `ex-${Date.now()}-${counter++}`, topicId, skillId, level, difficulty: d }
    const same = opts.avoid && JSON.stringify(ex.tokens) === JSON.stringify(opts.avoid.tokens) && ex.instruction === opts.avoid.instruction
    if (!same) return ex
  }
  const skillId = opts.skillId ?? def.skills[0]
  return { ...SKILLS[skillId](d, rng), id: `ex-${Date.now()}-${counter++}`, topicId, skillId, level, difficulty: d }
}

export function checkAnswer(ex: Exercise, values: number[]): boolean {
  if (ex.validate) return ex.validate(values)
  return ex.answers.length === values.length && ex.answers.every((a, i) => a === values[i])
}
