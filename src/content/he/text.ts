export type Gender = 'f' | 'm'

/** A child-facing string: either gender-neutral, or with feminine and masculine forms. */
export type Txt = string | { f: string; m: string }

export const g = (f: string, m: string): Txt => ({ f, m })

export function tx(t: Txt, gender: Gender): string {
  return typeof t === 'string' ? t : t[gender]
}

/** Join several Txt parts with a space, keeping gender variants. */
export function join(...parts: Txt[]): Txt {
  if (parts.every((p) => typeof p === 'string')) return parts.join(' ')
  return { f: parts.map((p) => tx(p, 'f')).join(' '), m: parts.map((p) => tx(p, 'm')).join(' ') }
}

const NIKUD = /[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g

export const stripNikud = (s: string) => s.replace(NIKUD, '')

export const hasNikud = (s: string) => /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/.test(s)
