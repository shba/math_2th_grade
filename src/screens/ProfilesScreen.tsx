import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { Character } from '../components/Characters'
import { Screen } from '../components/Chrome'
import { db, type Profile } from '../data/db'
import { speak } from '../speech/speech'
import { useEffect } from 'react'

export const profileCharacter = (p: Profile) => (p.avatar === 'animal' ? p.companion : p.avatar)

export function ProfilesScreen() {
  const nav = useNavigate()
  const { setProfileId } = useApp()
  const profiles = useLiveQuery(() => db.profiles.toArray(), [])

  useEffect(() => void speak('מִי כָּאן הַיּוֹם?'), [])

  return (
    <Screen className="profiles">
      <h1 className="title">מִי כָּאן הַיּוֹם?</h1>
      <div className="profile-grid">
        {profiles?.map((p) => (
          <button
            key={p.id}
            type="button"
            className="profile-card"
            onClick={() => {
              setProfileId(p.id)
              nav(p.placementDone ? '/map' : '/placement')
            }}
          >
            <Character kind={profileCharacter(p)} size={80} talkWithSpeech={false} />
            <span className="profile-name">{p.name}</span>
          </button>
        ))}
        <button type="button" className="profile-card add" onClick={() => nav('/new')}>
          <span className="plus" aria-hidden>
            ＋
          </span>
          <span className="profile-name">הוֹסָפָה</span>
        </button>
      </div>
      <button type="button" className="parent-link" onClick={() => nav('/parent')}>
        🔒 אֵזוֹר הוֹרִים
      </button>
    </Screen>
  )
}
