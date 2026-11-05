import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Screen, TopBar } from '../../components/Chrome'
import { profileCharacter } from '../ProfilesScreen'
import { Character } from '../../components/Characters'
import { ALL_BADGES, TOPICS } from '../../curriculum/topics'
import { db, deleteProfile, resetProgress, type Profile, type ProfileSettings } from '../../data/db'
import { currentLevel } from '../../engine/adaptive'
import { ERROR_LABELS } from '../../engine/errorAnalysis'
import { accuracy, activeDays, dailyMinutes, errorCounts, hourHeatmap, pace, topicStatus, type TopicStatus } from '../../engine/stats'
import { getSpeechSettings, hebrewVoices, saveSpeechSettings, speak, waitForVoices } from '../../speech/speech'
import { isParentUnlocked } from './ParentGate'

const STATUS: Record<TopicStatus, { label: string; cls: string }> = {
  mastered: { label: 'שולט/ת', cls: 'ok' },
  reinforce: { label: 'צריך חיזוק', cls: 'warn' },
  progress: { label: 'בתהליך', cls: 'mid' },
  new: { label: 'עוד לא התחיל/ה', cls: 'none' },
}

const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

function ProfileReport({ profile }: { profile: Profile }) {
  const id = profile.id!
  const data = useLiveQuery(async () => {
    const [progress, attempts, usage, badges] = await Promise.all([
      db.progress.where('profileId').equals(id).toArray(),
      db.attempts.where('profileId').equals(id).sortBy('ts'),
      db.usage.where('profileId').equals(id).toArray(),
      db.badges.where('profileId').equals(id).toArray(),
    ])
    return { progress, attempts, usage, badges }
  }, [id])
  if (!data) return null
  const { progress, attempts, usage, badges } = data
  const learning = attempts.filter((a) => a.mode !== 'game')
  const weekAgo = Date.now() - 7 * 86400000
  const week = learning.filter((a) => a.ts >= weekAgo)
  const days = dailyMinutes(usage, 14)
  const maxMin = Math.max(5, ...days.map((d) => d.minutes))
  const heat = hourHeatmap(usage)
  const hours = Array.from({ length: 16 }, (_, i) => i + 6)
  const maxHeat = Math.max(1, ...heat.flat())
  const p = pace(badges.filter((b) => b.level !== undefined).map((b) => b.earnedAt))
  const errors = errorCounts(learning.filter((a) => !a.correct || a.mirrored)).slice(0, 6)
  const today = days[days.length - 1].minutes
  const weekMinutes = days.slice(-7).reduce((s, d) => s + d.minutes, 0)

  return (
    <div className="report">
      <section className="stat-cards">
        <div className="stat"><b>{today.toFixed(0)}</b><span>דקות היום</span></div>
        <div className="stat"><b>{weekMinutes.toFixed(0)}</b><span>דקות ב־7 ימים</span></div>
        <div className="stat"><b>{week.length ? Math.round(accuracy(week) * 100) : '–'}{week.length ? '%' : ''}</b><span>הצלחה בשבוע</span></div>
        <div className="stat"><b>{week.length}</b><span>תרגילים בשבוע</span></div>
        <div className="stat"><b>{activeDays(usage)}</b><span>ימי תרגול</span></div>
        <div className="stat"><b>{p.week} / {p.month}</b><span>רמות שעברה (שבוע / 4 שבועות)</span></div>
        <div className="stat"><b>{badges.length} / {ALL_BADGES.length}</b><span>תגים</span></div>
      </section>

      <section className="panel">
        <h2>שליטה בנושאים</h2>
        <table className="topics-table">
          <thead>
            <tr><th>נושא</th><th>רמה</th><th>מצב</th><th>הצלחה אחרונה</th></tr>
          </thead>
          <tbody>
            {TOPICS.map((t) => {
              const pr = progress.find((x) => x.topicId === t.id)
              const st = topicStatus(pr ?? { topicId: t.id, passedLevels: 0, difficulty: 1, streak: 0, wrongStreak: 0, levelCorrect: 0, lessonSeen: false, testsTaken: 0 }, learning)
              const recent = learning.filter((a) => a.topicId === t.id).slice(-15)
              return (
                <tr key={t.id}>
                  <td><span aria-hidden>{t.land.emoji}</span> {t.title}</td>
                  <td>{pr ? `${Math.min(pr.passedLevels, t.levels.length)}/${t.levels.length}` : `0/${t.levels.length}`}{pr && pr.passedLevels < t.levels.length ? ` (בתרגול: ${currentLevel(pr)})` : ''}</td>
                  <td><span className={`chip ${STATUS[st].cls}`}>{STATUS[st].label}</span></td>
                  <td className="num">{recent.length ? `${Math.round(accuracy(recent) * 100)}%` : '–'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>טעויות חוזרות</h2>
        {errors.length ? (
          <ul className="error-list">
            {errors.map(([type, count]) => (
              <li key={type}>
                <span>{ERROR_LABELS[type]}</span>
                <span className="bar" style={{ inlineSize: `${(count / errors[0][1]) * 100}%` }} />
                <b className="num">{count}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">עדיין אין מספיק נתונים.</p>
        )}
        <p className="muted small">ספרות הפוכות וכתב ראי מזוהים מכתב היד ומהתשובות. הילד/ה מקבל/ת הסבר מיד כשזה קורה.</p>
      </section>

      <section className="panel">
        <h2>דקות תרגול ביום (14 ימים)</h2>
        <div className="day-bars" dir="ltr">
          {days.map((d) => (
            <div key={d.date} className="day" title={`${d.date}: ${d.minutes} דק׳`}>
              <span className="fill" style={{ blockSize: `${(d.minutes / maxMin) * 100}%` }} />
              <small>{Number(d.date.slice(8))}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>מתי מתרגלים (יום × שעה)</h2>
        <div className="heatmap" role="table" aria-label="מפת חום של זמני תרגול">
          <div className="hm-row" role="row">
            <span />
            {hours.map((h) => <small key={h} className="num">{h % 3 === 0 ? h : ''}</small>)}
          </div>
          {DAYS.map((d, wd) => (
            <div key={d} className="hm-row" role="row">
              <span>{d}</span>
              {hours.map((h) => (
                <span key={h} className="hm-cell" role="cell" title={`${d} ${h}:00 — ${heat[wd][h].toFixed(0)} דק׳`} style={{ opacity: heat[wd][h] ? 0.2 + (heat[wd][h] / maxHeat) * 0.8 : 0.06 }} />
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ProfileSettingsPanel({ profile }: { profile: Profile }) {
  const nav = useNavigate()
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null)
  const set = (k: keyof ProfileSettings, v: boolean) => db.profiles.update(profile.id!, { settings: { ...profile.settings, [k]: v } })
  const toggles: [keyof ProfileSettings, string][] = [
    ['reducedMotion', 'פחות תנועה (אנימציות מופחתות)'],
    ['mute', 'השתקת הקראה לפרופיל זה'],
    ['handwriting', 'כתב יד ככלי ברירת המחדל (במקום מקלדת)'],
    ['unlockAll', 'פתיחת כל הנושאים (בלי לחכות למבחני רמה)'],
  ]
  return (
    <section className="panel">
      <h2>הגדרות עבור {profile.name}</h2>
      {toggles.map(([k, label]) => (
        <label key={k} className="toggle">
          <input type="checkbox" checked={k === 'handwriting' ? profile.settings.handwriting !== false : !!profile.settings[k]} onChange={(e) => void set(k, e.target.checked)} />
          <span>{label}</span>
        </label>
      ))}
      <div className="row">
        <button type="button" className="btn ghost" onClick={() => setConfirm('reset')}>איפוס התקדמות</button>
        <button type="button" className="btn danger" onClick={() => setConfirm('delete')}>מחיקת פרופיל</button>
      </div>
      {confirm && (
        <div className="confirm-box" role="alertdialog" aria-label="אישור">
          <p>{confirm === 'reset' ? `לאפס את כל ההתקדמות, התגים והתשובות של ${profile.name}? מבחן הפתיחה יתחיל מחדש.` : `למחוק את ${profile.name} וכל הנתונים שלו/ה מהמכשיר?`}</p>
          <div className="row">
            <button
              type="button"
              className="btn danger"
              onClick={async () => {
                if (confirm === 'reset') await resetProgress(profile.id!)
                else {
                  await deleteProfile(profile.id!)
                  if (localStorage.getItem('mk-profile') === String(profile.id)) localStorage.removeItem('mk-profile')
                  nav('/parent/dashboard', { replace: true })
                }
                setConfirm(null)
              }}
            >
              כן, {confirm === 'reset' ? 'לאפס' : 'למחוק'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>ביטול</button>
          </div>
        </div>
      )}
    </section>
  )
}

function SpeechPanel() {
  const [s, setS] = useState(getSpeechSettings())
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(hebrewVoices())
  useEffect(() => void waitForVoices().then(setVoices), [])
  const update = (patch: Partial<typeof s>) => {
    saveSpeechSettings(patch)
    setS({ ...getSpeechSettings() })
  }
  return (
    <section className="panel">
      <h2>הקראה</h2>
      {!voices.length && (
        <div className="banner warn" role="status">
          <b>לא נמצא קול עברי במכשיר.</b>
          <ul>
            <li>אנדרואיד: הגדרות ← נגישות / ניהול כללי ← המרת טקסט לדיבור ← בחרו "שירותי הדיבור של Google" ← התקינו נתוני קול לעברית.</li>
            <li>אייפון/אייפד: הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית ← Carmit (מומלץ להוריד גרסה משופרת).</li>
            <li>מחשב: Edge מספק קולות עבריים איכותיים (Hila / Avri). ב־Windows: הגדרות ← זמן ושפה ← דיבור ← הוספת קולות.</li>
          </ul>
          <p>לאחר ההתקנה סגרו ופתחו את האפליקציה מחדש.</p>
        </div>
      )}
      {voices.length > 0 && (
        <label className="field">
          <span>קול</span>
          <select value={s.voiceURI ?? ''} onChange={(e) => update({ voiceURI: e.target.value || undefined })}>
            <option value="">אוטומטי (הטוב ביותר)</option>
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
          </select>
        </label>
      )}
      <label className="field">
        <span>מהירות: <bdi dir="ltr">{s.rate.toFixed(2)}</bdi></span>
        <input type="range" min={0.6} max={1.2} step={0.05} value={s.rate} onChange={(e) => update({ rate: Number(e.target.value) })} />
      </label>
      <label className="toggle">
        <input type="checkbox" checked={s.withNikud} onChange={(e) => update({ withNikud: e.target.checked })} />
        <span>לשלוח למנוע הדיבור טקסט מנוקד (כבו אם ההגייה נשמעת משובשת)</span>
      </label>
      <label className="toggle">
        <input type="checkbox" checked={s.muted} onChange={(e) => update({ muted: e.target.checked })} />
        <span>השתקת הקראה במכשיר זה</span>
      </label>
      <button type="button" className="btn ghost" onClick={() => void speak('שָׁלוֹם! שְׁמוֹנֶה וְעוֹד חָמֵשׁ שָׁוֶה שְׁלוֹשׁ עֶשְׂרֵה.')}>🔊 בדיקת קול</button>
    </section>
  )
}

export function ParentDashboard() {
  const profiles = useLiveQuery(() => db.profiles.toArray())
  const [selected, setSelected] = useState<number | undefined>()
  if (!isParentUnlocked()) return <Navigate to="/parent" replace />
  if (!profiles) return null
  const profile = profiles.find((p) => p.id === selected) ?? profiles[0]

  return (
    <Screen className="parent dashboard">
      <TopBar title="אזור הורים" back="/profiles" right={<Link className="icon-btn" to="/parent/credits" aria-label="קרדיטים">ℹ️</Link>} />
      {!profiles.length ? (
        <p className="muted">עדיין אין פרופילים.</p>
      ) : (
        <>
          <nav className="profile-tabs" aria-label="בחירת ילד/ה">
            {profiles.map((p) => (
              <button key={p.id} type="button" className={`tab ${p.id === profile.id ? 'on' : ''}`} aria-pressed={p.id === profile.id} onClick={() => setSelected(p.id)}>
                <Character kind={profileCharacter(p)} size={36} talkWithSpeech={false} />
                {p.name}
              </button>
            ))}
          </nav>
          <ProfileReport profile={profile} />
          <ProfileSettingsPanel profile={profile} />
        </>
      )}
      <SpeechPanel />
      <section className="panel">
        <h2>פרטיות</h2>
        <p className="muted">כל הנתונים נשמרים רק במכשיר הזה (IndexedDB). אין חשבונות, אין פרסומות ואין מעקב.</p>
        <Link to="/parent/credits">קרדיטים ורישיונות</Link>
      </section>
    </Screen>
  )
}
