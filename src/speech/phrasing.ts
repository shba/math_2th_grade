import type { Choice, Token } from '../exercises/types'

const OP_WORDS: Record<string, string> = {
  '+': 'וְעוֹד',
  '-': 'פָּחוֹת',
  '×': 'כָּפוּל',
  ':': 'חֶלְקֵי',
  '=': 'שָׁוֶה',
  '<': 'קָטָן מִ־',
  '>': 'גָּדוֹל מִ־',
  ',': ',',
  '…': '',
}

/** An exercise read aloud ("3 וְעוֹד 4 שָׁוֶה כַּמָּה"). Numbers stay as digits; the player reads them. */
export function tokensForSpeech(tokens: Token[], blankWord = 'כַּמָּה'): string {
  return tokens
    .map((t) => {
      if (t.t === 'n') return String(t.v)
      if (t.t === 'blank') return blankWord
      if (t.t === 'w') return t.v
      return OP_WORDS[t.v]
    })
    .join(' ')
    .replace(/־ (?=\d)/g, '־')
    .replace(/ ,/g, ',')
}

export const choicesForSpeech = (choices: Choice[]) =>
  choices.filter((c) => c.label || c.speak).map((c) => c.speak ?? c.label).join(', אוֹ ')
