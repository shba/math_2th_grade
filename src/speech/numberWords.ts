// Numbers in the feminine counting form, which is how numbers are read aloud in math.

const UNITS = ['אֶפֶס', 'אַחַת', 'שְׁתַּיִם', 'שָׁלוֹשׁ', 'אַרְבַּע', 'חָמֵשׁ', 'שֵׁשׁ', 'שֶׁבַע', 'שְׁמוֹנֶה', 'תֵּשַׁע', 'עֶשֶׂר']
const TEENS = ['', 'אַחַת־עֶשְׂרֵה', 'שְׁתֵּים־עֶשְׂרֵה', 'שְׁלוֹשׁ־עֶשְׂרֵה', 'אַרְבַּע־עֶשְׂרֵה', 'חֲמֵשׁ־עֶשְׂרֵה', 'שֵׁשׁ־עֶשְׂרֵה', 'שְׁבַע־עֶשְׂרֵה', 'שְׁמוֹנֶה־עֶשְׂרֵה', 'תְּשַׁע־עֶשְׂרֵה']
const TENS = ['', 'עֶשֶׂר', 'עֶשְׂרִים', 'שְׁלוֹשִׁים', 'אַרְבָּעִים', 'חֲמִשִּׁים', 'שִׁשִּׁים', 'שִׁבְעִים', 'שְׁמוֹנִים', 'תִּשְׁעִים']
const HUNDREDS = ['', 'מֵאָה', 'מָאתַיִם', 'שְׁלוֹשׁ מֵאוֹת', 'אַרְבַּע מֵאוֹת', 'חֲמֵשׁ מֵאוֹת', 'שֵׁשׁ מֵאוֹת', 'שְׁבַע מֵאוֹת', 'שְׁמוֹנֶה מֵאוֹת', 'תְּשַׁע מֵאוֹת']

/** Prefix "and" with the vowel Hebrew grammar asks for. */
export function withVav(word: string): string {
  const first = word[0]
  const vowel = word[1] === '\u05BC' ? word[2] : word[1]
  if (vowel === '\u05B0' || 'במפ'.includes(first)) return `וּ${word}`
  if (vowel === '\u05B2') return `וַ${word}`
  return `וְ${word}`
}

function below100(n: number): string {
  if (n <= 10) return UNITS[n]
  if (n < 20) return TEENS[n - 10]
  const t = TENS[Math.floor(n / 10)]
  const u = n % 10
  return u ? `${t} ${withVav(UNITS[u])}` : t
}

export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) return String(n)
  if (n === 1000) return 'אֶלֶף'
  if (n > 1000) return String(n)
  if (n < 100) return below100(n)
  const h = HUNDREDS[Math.floor(n / 100)]
  const rest = n % 100
  if (!rest) return h
  // Single-word remainders take "and": מֵאָה וְחָמֵשׁ, but מֵאָה עֶשְׂרִים וְשָׁלוֹשׁ.
  const r = below100(rest)
  return r.includes(' ') ? `${h} ${r}` : `${h} ${withVav(r)}`
}
