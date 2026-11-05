import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Character } from '../components/Characters'
import { Screen } from '../components/Chrome'
import { db } from '../data/db'
import { loadManifest, speak, unlockSpeech, waitForVoices } from '../speech/speech'
import { useApp } from '../app/AppContext'

export function StartScreen() {
  const nav = useNavigate()
  const { profileId, setProfileId } = useApp()

  const start = async () => {
    unlockSpeech()
    const [clips, voices] = await Promise.all([loadManifest(), waitForVoices()])
    if (!clips && !voices.length) sessionStorage.setItem('mk-no-voice', '1')
    const profiles = await db.profiles.toArray()
    const current = profiles.find((p) => p.id === profileId)
    if (!current && profiles.length === 1) setProfileId(profiles[0].id)
    const chosen = current ?? (profiles.length === 1 ? profiles[0] : undefined)
    void speak('שָׁלוֹם! בָּרוּכִים הַבָּאִים לְמַמְלֶכֶת הַחֶשְׁבּוֹן.')
    if (!profiles.length) nav('/new')
    else if (!chosen) nav('/profiles')
    else nav(chosen.placementDone ? '/map' : '/placement')
  }

  return (
    <Screen className="start">
      <h1 className="logo">מַמְלֶכֶת הַחֶשְׁבּוֹן</h1>
      <div className="start-chars">
        <Character kind="princess" size={130} />
        <Character kind="unicorn" size={110} />
      </div>
      <motion.button type="button" className="btn primary huge" onClick={start} whileTap={{ scale: 0.95 }} autoFocus>
        נַתְחִיל! ▶
      </motion.button>
      <p className="start-note">🔊 הַדְּמֻיּוֹת מְדַבְּרוֹת — כְּדַאי לְהַגְבִּיר אֶת הַקּוֹל</p>
    </Screen>
  )
}
