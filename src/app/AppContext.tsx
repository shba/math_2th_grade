import { MotionConfig } from 'framer-motion'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { tx, type Gender, type Txt } from '../content/he/text'
import { addUsage, db, type Profile } from '../data/db'
import { setProfileMuted } from '../speech/speech'

interface AppState {
  profile?: Profile
  profileId?: number
  setProfileId: (id: number | undefined) => void
  gender: Gender
  t: (txt: Txt) => string
  reducedMotion: boolean
}

const Ctx = createContext<AppState | null>(null)

const KEY = 'mk-profile'

const prefersReduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function AppProvider({ children }: { children: ReactNode }) {
  const [profileId, setId] = useState<number | undefined>(() => {
    const v = localStorage.getItem(KEY)
    return v ? Number(v) : undefined
  })
  const profile = useLiveQuery(() => (profileId ? db.profiles.get(profileId) : undefined), [profileId])
  const gender: Gender = profile?.gender ?? 'f'
  const reducedMotion = profile?.settings.reducedMotion ?? prefersReduced()

  const setProfileId = (id: number | undefined) => {
    if (id) localStorage.setItem(KEY, String(id))
    else localStorage.removeItem(KEY)
    setId(id)
  }

  useEffect(() => setProfileMuted(!!profile?.settings.mute), [profile?.settings.mute])

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduce' : 'full'
  }, [reducedMotion])

  // Time on task: count 15 s slices while the app is visible and the child touched it in the last minute.
  useEffect(() => {
    if (!profileId) return
    let last = Date.now()
    const touch = () => (last = Date.now())
    window.addEventListener('pointerdown', touch)
    window.addEventListener('keydown', touch)
    const t = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - last < 60000 && !location.hash.includes('/parent')) {
        void addUsage(profileId, 15)
      }
    }, 15000)
    return () => {
      clearInterval(t)
      window.removeEventListener('pointerdown', touch)
      window.removeEventListener('keydown', touch)
    }
  }, [profileId])

  const value = useMemo<AppState>(
    () => ({ profile, profileId, setProfileId, gender, t: (x: Txt) => tx(x, gender), reducedMotion }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, profileId, gender, reducedMotion],
  )

  return (
    <Ctx.Provider value={value}>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>{children}</MotionConfig>
    </Ctx.Provider>
  )
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}
