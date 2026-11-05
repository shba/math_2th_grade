import type { CharacterKind } from '../components/Characters'
import { COMPANION_NAMES, HERO_NAMES } from '../components/Characters'
import type { Companion } from '../data/db'
import { useApp } from './AppContext'

export function useGuide(): { hero: CharacterKind; pet: Companion; heroName: string; petName: string } {
  const { profile } = useApp()
  const pet = profile?.companion ?? 'unicorn'
  const avatar = profile?.avatar ?? 'princess'
  const hero: CharacterKind = avatar === 'animal' ? pet : avatar
  return {
    hero,
    pet,
    heroName: avatar === 'animal' ? COMPANION_NAMES[pet] : HERO_NAMES[avatar],
    petName: COMPANION_NAMES[pet],
  }
}
