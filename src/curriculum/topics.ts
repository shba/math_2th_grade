import type { Difficulty, TopicId } from '../exercises/types'

export interface BadgeDef {
  id: string
  name: string
  emoji: string
}

export interface LevelDef {
  title: string
  skills: string[]
  dMin?: Difficulty
  dMax?: Difficulty
  badge: BadgeDef
}

export interface TopicDef {
  id: TopicId
  title: string
  land: { name: string; emoji: string; color: string; soft: string }
  levels: LevelDef[]
  crown: BadgeDef
}

const ANIMALS: [string, string][] = [
  ['🦄', 'חַד־קֶרֶן'], ['🐰', 'אַרְנָב'], ['🦊', 'שׁוּעָל'], ['🐱', 'חָתוּל'], ['🐼', 'פַּנְדָּה'],
  ['🐨', 'קוֹאָלָה'], ['🦋', 'פַּרְפַּר'], ['🐢', 'צָב'], ['🦔', 'קִפּוֹד'], ['🐧', 'פִּינְגְּוִין'],
  ['🦉', 'יַנְשׁוּף'], ['🐞', 'פָּרַת מֹשֶׁה רַבֵּנוּ'], ['🐬', 'דּוֹלְפִין'], ['🦁', 'אַרְיֵה'], ['🐸', 'צְפַרְדֵּעַ'],
  ['🐿️', 'סְנָאִי'], ['🦒', 'גִּ׳ירָפָה'], ['🐝', 'דְּבוֹרָה'], ['🐳', 'לִוְיָתָן'], ['🦚', 'טַוָּס'],
  ['🐥', 'אֶפְרוֹחַ'], ['🐹', 'אוֹגֵר'], ['🐻', 'דֹּב'], ['🦩', 'פְלָמִינְגּוֹ'], ['🐙', 'תְּמָנוּן'],
  ['🦜', 'תֻּכִּי'], ['🐮', 'פָּרָה'], ['🦦', 'לוּטְרָה'], ['🦥', 'עַצְלָן'], ['🦓', 'זֶבְּרָה'],
  ['🐘', 'פִּיל'], ['🐵', 'קוֹף'], ['🦆', 'בַּרְוָז'], ['🐴', 'סוּס'], ['🐑', 'כֶּבֶשׂ'],
]

let animalIndex = 0
const lv = (title: string, skills: string[], range?: [Difficulty, Difficulty]): LevelDef => {
  const [emoji, name] = ANIMALS[animalIndex % ANIMALS.length]
  animalIndex++
  return { title, skills, dMin: range?.[0], dMax: range?.[1], badge: { id: `animal-${animalIndex}`, name, emoji } }
}
const crown = (id: TopicId, name: string): BadgeDef => ({ id: `crown-${id}`, name, emoji: '👑' })

export const TOPICS: TopicDef[] = [
  {
    id: 'add-sub-20',
    title: 'חִבּוּר וְחִסּוּר עַד 20',
    land: { name: 'יַעַר הַחִבּוּר', emoji: '🌳', color: '#166534', soft: '#dcfce7' },
    levels: [
      lv('חִבּוּר וְחִסּוּר עַד 10', ['add10', 'sub10']),
      lv('חִבּוּר וְחִסּוּר עַד 20', ['add20', 'sub20']),
      lv('הַמִּסְפָּר הֶחָסֵר', ['missing', 'decompose', 'howManyMissing']),
      lv('מְכוֹנוֹת וְתַרְגִּילִים', ['writeExercise', 'chain', 'add20', 'sub20'], [2, 3]),
    ],
    crown: crown('add-sub-20', 'כֶּתֶר הַיַּעַר'),
  },
  {
    id: 'numbers-1000',
    title: 'מִסְפָּרִים עַד 1,000',
    land: { name: 'טִירַת הַמִּסְפָּרִים', emoji: '🏰', color: '#6b21a8', soft: '#f3e8ff' },
    levels: [
      lv('עֲשָׂרוֹת וִיחִידוֹת', ['placeValue', 'tensOnes', 'neighbors']),
      lv('סְדָרוֹת וּמִסְפָּרִים זוּגִיִּים', ['sequence', 'evenOdd', 'compare']),
      lv('מֵאוֹת', ['placeValue3', 'hundreds', 'compare'], [2, 3]),
      lv('אוֹתִיּוֹת כְּמִסְפָּרִים', ['gimatria']),
    ],
    crown: crown('numbers-1000', 'כֶּתֶר הַטִּירָה'),
  },
  {
    id: 'add-sub-100',
    title: 'חִבּוּר וְחִסּוּר עַד 100',
    land: { name: 'אֲגַם הַמֵּאָה', emoji: '🦢', color: '#1e40af', soft: '#dbeafe' },
    levels: [
      lv('בְּלִי הֲמָרָה', ['tens', 'addSubNoRegroup']),
      lv('עִם הֲמָרָה', ['addSubRegroup']),
      lv('שְׁנֵי מִסְפָּרִים דּוּ־סִפְרָתִיִּים', ['twoDigit']),
      lv('חִבּוּר וְחִסּוּר בִּמְאוּנָךְ', ['column']),
    ],
    crown: crown('add-sub-100', 'כֶּתֶר הָאֲגַם'),
  },
  {
    id: 'word-problems',
    title: 'שְׁאֵלוֹת מִלּוּלִיּוֹת',
    land: { name: 'כְּפַר הַסִּפּוּרִים', emoji: '🏡', color: '#9a3412', soft: '#ffedd5' },
    levels: [
      lv('סִפּוּר שֶׁל צַעַד אֶחָד', ['oneStep']),
      lv('הַשְׁוָאָה וּקְנִיּוֹת', ['compareStory', 'prices']),
      lv('סִפּוּר שֶׁל שְׁנֵי צְעָדִים', ['twoStep', 'prices'], [2, 3]),
    ],
    crown: crown('word-problems', 'כֶּתֶר הַכְּפָר'),
  },
  {
    id: 'mult-div',
    title: 'כֶּפֶל וְחִלּוּק',
    land: { name: 'הַר הַכֶּפֶל', emoji: '⛰️', color: '#9f1239', soft: '#ffe4e6' },
    levels: [
      lv('מָה זֶה כֶּפֶל?', ['groups', 'repeatedAdd']),
      lv('לוּחַ הַכֶּפֶל עַד 6', ['table6', 'legs']),
      lv('חִלּוּק', ['division']),
      lv('קְנִיָּה וְעֹדֶף', ['money']),
      lv('לוּחַ הַכֶּפֶל עַד 10', ['table10']),
    ],
    crown: crown('mult-div', 'כֶּתֶר הָהָר'),
  },
  {
    id: 'line-fractions',
    title: 'יְשַׁר הַמִּסְפָּרִים, חֲצִי וְרֶבַע',
    land: { name: 'גֶּשֶׁר הַקֶּשֶׁת', emoji: '🌈', color: '#0f766e', soft: '#ccfbf1' },
    levels: [
      lv('יְשַׁר הַמִּסְפָּרִים', ['numberLine', 'jumps']),
      lv('חֲצִי וְרֶבַע שֶׁל צוּרָה', ['fractionShape']),
      lv('חֲצִי וְרֶבַע שֶׁל כַּמּוּת', ['fractionQty']),
    ],
    crown: crown('line-fractions', 'כֶּתֶר הַקֶּשֶׁת'),
  },
  {
    id: 'data',
    title: 'חֵקֶר נְתוּנִים',
    land: { name: 'גַּן הַחַמָּנִיּוֹת', emoji: '🌻', color: '#854d0e', soft: '#fef9c3' },
    levels: [
      lv('קְרִיאַת דִּיאַגְרָמָה', ['bars'], [1, 2]),
      lv('הַשְׁוָאַת נְתוּנִים', ['bars'], [2, 3]),
    ],
    crown: crown('data', 'כֶּתֶר הַגַּן'),
  },
  {
    id: 'measurement',
    title: 'מְדִידוֹת וְשָׁעוֹן',
    land: { name: 'מִגְדַּל הַשָּׁעוֹן', emoji: '🕰️', color: '#3730a3', soft: '#e0e7ff' },
    levels: [
      lv('אֹרֶךְ', ['ruler']),
      lv('שֶׁטַח וְהֶקֵּף', ['area']),
      lv('מִשְׁקָל וְשָׁעוֹן', ['weight', 'clock'], [1, 2]),
      lv('רִבְעֵי שָׁעָה וּמֶשֶׁךְ זְמַן', ['clock', 'duration'], [2, 3]),
    ],
    crown: crown('measurement', 'כֶּתֶר הַמִּגְדָּל'),
  },
  {
    id: 'geometry',
    title: 'גּוּפִים וְצוּרוֹת',
    land: { name: 'מְעָרַת הַגְּבִישִׁים', emoji: '💎', color: '#86198f', soft: '#fae8ff' },
    levels: [
      lv('גּוּפִים', ['solidName']),
      lv('פֵּאוֹת וְקׇדְקוֹדִים', ['solidParts']),
      lv('סִימֶטְרִיָּה', ['symmetry']),
      lv('שִׁקּוּף וַהֲזָזָה', ['mirrorShift']),
    ],
    crown: crown('geometry', 'כֶּתֶר הַמְּעָרָה'),
  },
]

export const EFFORT_BADGES: (BadgeDef & { rule: 'days3' | 'days7' | 'solved100' | 'firstHandwriting' })[] = [
  { id: 'effort-days3', name: 'כּוֹכַב הַהַתְמָדָה', emoji: '🌟', rule: 'days3' },
  { id: 'effort-days7', name: 'קֶשֶׁת שֶׁל שָׁבוּעַ', emoji: '🌈', rule: 'days7' },
  { id: 'effort-solved100', name: 'מֵאָה תַּרְגִּילִים', emoji: '💯', rule: 'solved100' },
  { id: 'effort-handwriting', name: 'עֵט הַקֶּסֶם', emoji: '🪄', rule: 'firstHandwriting' },
]

export const topicById = (id: TopicId) => TOPICS.find((t) => t.id === id)!

export const ALL_BADGES: BadgeDef[] = [
  ...TOPICS.flatMap((t) => [...t.levels.map((l) => l.badge), t.crown]),
  ...EFFORT_BADGES,
]
