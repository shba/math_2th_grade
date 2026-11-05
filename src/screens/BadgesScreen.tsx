import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { useApp } from '../app/AppContext'
import { BadgeIcon, Screen, TopBar } from '../components/Chrome'
import { g } from '../content/he/text'
import { EFFORT_BADGES, TOPICS } from '../curriculum/topics'
import { db } from '../data/db'
import { speak } from '../speech/speech'

export function BadgesScreen() {
  const { profileId, t } = useApp()
  const rows = useLiveQuery(() => (profileId ? db.badges.where('profileId').equals(profileId).toArray() : []), [profileId])
  const earned = new Set(rows?.map((r) => r.badgeId))

  useEffect(() => {
    if (rows) void speak(t(g(`אָסַפְתְּ ${rows.length} תָּגִים. כׇּל תָּג הוּא חָבֵר חָדָשׁ!`, `אָסַפְתָּ ${rows.length} תָּגִים. כׇּל תָּג הוּא חָבֵר חָדָשׁ!`)))
  }, [rows?.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen className="badges-screen">
      <TopBar title="🏅 אֹסֶף הַתָּגִים" />
      {TOPICS.map((topic) => (
        <section key={topic.id} className="badge-shelf" style={{ ['--land' as string]: topic.land.color, ['--land-soft' as string]: topic.land.soft }}>
          <h2><span aria-hidden>{topic.land.emoji}</span> {topic.land.name}</h2>
          <ul>
            {[...topic.levels.map((l) => l.badge), topic.crown].map((b) => (
              <li key={b.id}>
                <BadgeIcon badge={b} earned={earned.has(b.id)} size={72} />
                <span className="badge-name">{earned.has(b.id) ? b.name : '?'}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="badge-shelf effort">
        <h2><span aria-hidden>💪</span> תָּגֵי מַאֲמָץ</h2>
        <ul>
          {EFFORT_BADGES.map((b) => (
            <li key={b.id}>
              <BadgeIcon badge={b} earned={earned.has(b.id)} size={72} />
              <span className="badge-name">{b.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  )
}
