import { HINTS, I } from '../../content/he/instructions'
import { blank } from '../helpers'
import type { Choice, GeneratorFn, SolidId } from '../types'

export const SOLIDS: { id: SolidId; name: string; le: string; faces?: number; vertices?: number; edges?: number }[] = [
  { id: 'cube', name: 'קֻבִּיָּה', le: 'לַקֻּבִּיָּה', faces: 6, vertices: 8, edges: 12 },
  { id: 'box', name: 'תֵּבָה', le: 'לַתֵּבָה', faces: 6, vertices: 8, edges: 12 },
  { id: 'pyramid', name: 'פִּירָמִידָה', le: 'לַפִּירָמִידָה', faces: 5, vertices: 5, edges: 8 },
  { id: 'cylinder', name: 'גָּלִיל', le: 'לַגָּלִיל' },
  { id: 'cone', name: 'חָרוּט', le: 'לֶחָרוּט' },
  { id: 'sphere', name: 'כַּדּוּר', le: 'לַכַּדּוּר' },
]

export const solidName: GeneratorFn = (d, rng) => {
  const pool = d === 1 ? SOLIDS.filter((s) => ['cube', 'cylinder', 'sphere', 'cone'].includes(s.id)) : SOLIDS
  const s = rng.pick(pool)
  const others = rng.shuffle(pool.filter((x) => x.id !== s.id)).slice(0, d === 1 ? 2 : 3)
  return {
    answers: [SOLIDS.indexOf(s)],
    choices: rng.shuffle([s, ...others]).map((x) => ({ label: x.name, value: SOLIDS.indexOf(x) })),
    answerType: 'choice',
    instruction: I.solidName,
    icon: 'eye',
    visual: { kind: 'solid', solid: s.id },
    hint: HINTS.solids,
  }
}

export const solidParts: GeneratorFn = (d, rng) => {
  const s = rng.pick(SOLIDS.filter((x) => x.faces && (d > 1 || x.id === 'cube')))
  const which = d === 1 ? 0 : d === 2 ? rng.int(0, 1) : rng.int(0, 2)
  const ans = [s.faces!, s.vertices!, s.edges!][which]
  const instr = [I.facesOf, I.verticesOf, I.edgesOf][which](s.le)
  return { tokens: [blank()], answers: [ans], answerType: 'number', instruction: instr, icon: 'count', visual: { kind: 'solid', solid: s.id }, hint: HINTS.faces }
}

type Pts = [number, number][]
const SYMMETRIC: Pts[] = [
  [[20, 95], [20, 45], [50, 10], [80, 45], [80, 95]],
  [[50, 8], [90, 92], [10, 92]],
  [[50, 5], [88, 50], [50, 95], [12, 50]],
  [[50, 5], [61, 38], [95, 38], [67, 60], [78, 95], [50, 73], [22, 95], [33, 60], [5, 38], [39, 38]],
  [[35, 95], [35, 50], [10, 50], [50, 8], [90, 50], [65, 50], [65, 95]],
]
const ASYMMETRIC: Pts[] = [
  [[10, 90], [30, 20], [85, 35], [70, 95]],
  [[20, 10], [45, 10], [45, 70], [85, 70], [85, 95], [20, 95]],
  [[55, 5], [20, 55], [48, 55], [30, 95], [80, 40], [52, 40], [70, 5]],
  [[10, 90], [10, 20], [90, 90]],
]

export const symmetry: GeneratorFn = (d, rng) => {
  const findOdd = d === 3 && rng.next() < 0.5
  const target = rng.pick(findOdd ? ASYMMETRIC : SYMMETRIC)
  const rest = rng.shuffle(findOdd ? SYMMETRIC : ASYMMETRIC).slice(0, d === 1 ? 1 : 2)
  const color = rng.pick(['#7c3aed', '#db2777', '#0f766e'])
  const choices: Choice[] = rng.shuffle([target, ...rest]).map((points, i) => ({
    label: '',
    value: points === target ? 99 : i,
    visual: { kind: 'shape', points, color },
  }))
  return {
    answers: [99],
    choices,
    answerType: 'choice',
    instruction: findOdd ? I.whichNotSymmetric : I.whichSymmetric,
    icon: 'choose',
    hint: HINTS.symmetry,
  }
}

const FLAG: Pts = [[20, 95], [20, 8], [80, 28], [28, 48], [28, 95]]
const mirrorV = (p: Pts): Pts => p.map(([x, y]) => [100 - x, y])
const flipH = (p: Pts): Pts => p.map(([x, y]) => [x, 100 - y])

export const mirrorShift: GeneratorFn = (_d, rng) => {
  const mirror = rng.next() < 0.5
  const color = '#2563eb'
  const options: { pts: Pts; v: number }[] = [
    { pts: FLAG, v: 0 },
    { pts: mirrorV(FLAG), v: 1 },
    { pts: flipH(FLAG), v: 2 },
  ]
  return {
    answers: [mirror ? 1 : 0],
    choices: rng.shuffle(options).map((o) => ({ label: '', value: o.v, visual: { kind: 'shape', points: o.pts, color } })),
    answerType: 'choice',
    instruction: mirror ? I.whichMirror : I.whichShift,
    icon: 'choose',
    visual: { kind: 'shape', points: FLAG, color: '#f59e0b', axis: mirror ? 'v' : undefined },
    hint: HINTS.mirror,
  }
}
