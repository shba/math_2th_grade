import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen, TopBar } from '../../components/Chrome'

export const PARENT_KEY = 'mk-parent'
export const isParentUnlocked = () => sessionStorage.getItem(PARENT_KEY) === '1'

function makeQuestion() {
  const b = 6 + Math.floor(Math.random() * 4)
  const a = 6 + Math.floor(Math.random() * 7)
  return { dividend: a * b, divisor: b, answer: a }
}

export function ParentGate() {
  const nav = useNavigate()
  const [q, setQ] = useState(makeQuestion)
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const label = useMemo(() => `${q.dividend} ÷ ${q.divisor}`, [q])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (Number(value) === q.answer) {
      sessionStorage.setItem(PARENT_KEY, '1')
      nav('/parent/dashboard', { replace: true })
    } else {
      setError(true)
      setValue('')
      setQ(makeQuestion())
    }
  }

  return (
    <Screen className="parent gate">
      <TopBar title="אזור הורים" back="/profiles" />
      <form className="gate-card" onSubmit={submit}>
        <p>כדי להיכנס, פתרו את התרגיל:</p>
        <p className="gate-q">
          <bdi dir="ltr">{label} = ?</bdi>
        </p>
        <input
          className="gate-input"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label={`תוצאת ${label}`}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />
        {error && <p className="gate-error" role="alert">לא נכון, נסו תרגיל אחר.</p>}
        <button type="submit" className="btn primary">כניסה</button>
      </form>
    </Screen>
  )
}
