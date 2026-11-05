import type { TopicId } from '../exercises/types'

export interface GameDef {
  id: 'feed' | 'castle' | 'race' | 'target'
  name: string
  emoji: string
  about: string
}

export const GAMES: GameDef[] = [
  { id: 'feed', name: 'הַאֲכָלַת הַחַיּוֹת', emoji: '🍎', about: 'תֵּן לְכׇל חַיָּה אֶת הַתַּפּוּחַ עִם הַתְּשׁוּבָה הַנְּכוֹנָה' },
  { id: 'castle', name: 'בּוֹנִים טִירָה', emoji: '🏰', about: 'מִגְדָּלִים הֵם עֲשָׂרוֹת, לְבֵנִים הֵן יְחִידוֹת' },
  { id: 'race', name: 'מֵרוֹץ הַכִּרְכָּרָה', emoji: '🐴', about: 'חִבּוּר וְחִסּוּר עַד 20' },
  { id: 'target', name: 'קְלִיעָה לַמַּטָּרָה', emoji: '🎯', about: 'לְהַגִּיעַ לְתוֹצָאָה בֵּין 12 לְ־15' },
]

export const gameById = (id: string) => GAMES.find((g) => g.id === id)

const [feed, castle, race, target] = GAMES

export const GAMES_FOR_TOPIC: Partial<Record<TopicId, GameDef[]>> = {
  'add-sub-20': [feed, race, target],
  'numbers-1000': [castle, feed],
  'add-sub-100': [feed, target],
  'word-problems': [feed],
  'mult-div': [feed],
  'line-fractions': [feed],
}
