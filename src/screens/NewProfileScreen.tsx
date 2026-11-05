import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { Character, COMPANION_NAMES, HERO_NAMES } from '../components/Characters'
import { Screen, TopBar } from '../components/Chrome'
import { g, tx, type Gender } from '../content/he/text'
import { db, type Avatar, type Companion } from '../data/db'
import { speak } from '../speech/speech'

const COMPANIONS: Companion[] = ['unicorn', 'bunny', 'fox', 'kitten']

export function NewProfileScreen() {
  const nav = useNavigate()
  const { setProfileId } = useApp()
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState<Gender>('f')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<Avatar>('princess')
  const [companion, setCompanion] = useState<Companion>('unicorn')

  const prompts = [
    'בַּת אוֹ בֵּן?',
    tx(g('אֵיךְ קוֹרְאִים לָךְ?', 'אֵיךְ קוֹרְאִים לְךָ?'), gender),
    tx(g('בַּחֲרִי דְּמוּת', 'בְּחַר דְּמוּת'), gender),
    tx(g('בַּחֲרִי חָבֵר מֵהַמַּמְלָכָה', 'בְּחַר חָבֵר מֵהַמַּמְלָכָה'), gender),
  ]

  useEffect(() => void speak(prompts[step]), [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    const id = await db.profiles.add({
      name: name.trim() || 'אני',
      gender,
      avatar,
      companion,
      createdAt: Date.now(),
      placementDone: false,
      settings: { handwriting: true },
    })
    setProfileId(id as number)
    nav('/placement')
  }

  return (
    <Screen className="new-profile">
      <TopBar back="/profiles" title={<span className="step-count">{step + 1} / 4</span>} />
      <h1 className="title">{prompts[step]}</h1>

      {step === 0 && (
        <div className="choice-row">
          {(['f', 'm'] as Gender[]).map((gd) => (
            <button key={gd} type="button" className={`pick-card ${gender === gd ? 'picked' : ''}`} onClick={() => { setGender(gd); setAvatar(gd === 'f' ? 'princess' : 'prince'); setStep(1) }}>
              <span className="big-emoji" aria-hidden>{gd === 'f' ? '👧' : '👦'}</span>
              <span>{gd === 'f' ? 'בַּת' : 'בֵּן'}</span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <form className="name-form" onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep(2) }}>
          <input className="name-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={14} autoFocus aria-label="שם" placeholder="שֵׁם" />
          <button type="submit" className="btn primary big" disabled={!name.trim()}>
            מַמְשִׁיכִים ←
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="choice-row">
          {(['princess', 'prince', 'animal'] as Avatar[]).map((a) => (
            <button key={a} type="button" className={`pick-card ${avatar === a ? 'picked' : ''}`} onClick={() => { setAvatar(a); setStep(3) }}>
              <Character kind={a === 'animal' ? 'bunny' : a} size={84} talkWithSpeech={false} />
              <span>{a === 'animal' ? 'רַק חָבֵר חַיָּה' : HERO_NAMES[a]}</span>
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <>
          <div className="choice-row wrap">
            {COMPANIONS.map((c) => (
              <button key={c} type="button" className={`pick-card ${companion === c ? 'picked' : ''}`} onClick={() => { setCompanion(c); void speak(COMPANION_NAMES[c]) }}>
                <Character kind={c} size={76} talkWithSpeech={false} />
                <span>{COMPANION_NAMES[c]}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn primary huge" onClick={create}>
            יוֹצְאִים לַדֶּרֶךְ! ✨
          </button>
        </>
      )}
    </Screen>
  )
}
