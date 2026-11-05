import { Screen, TopBar } from '../../components/Chrome'

const CREDITS: { what: string; who: string; license: string; url: string }[] = [
  { what: 'גופן Rubik', who: 'Hubert & Fischer, Meir Sadan, Cyreal', license: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/specimen/Rubik' },
  { what: 'גופן Fredoka', who: 'Milena Brandão, Hafontia', license: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/specimen/Fredoka' },
  { what: 'גופן Noto Sans Hebrew', who: 'Google', license: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew' },
  { what: 'דמויות הנסיכה, הנסיך והחיות', who: 'ציור מקורי לאפליקציה (SVG)', license: 'MIT, כמו קוד האפליקציה', url: 'https://github.com/shba/math_2th_grade' },
  { what: 'אימוג׳י', who: 'גופן האימוג׳י של מערכת ההפעלה במכשיר (לא מצורף לאפליקציה)', license: 'לפי מערכת ההפעלה', url: 'https://unicode.org/emoji/' },
  { what: 'זיהוי כתב יד: רשת נוירונים שאומנה לאפליקציה', who: 'נתוני אימון: MNIST (LeCun, Cortes, Burges) ו־EMNIST (Cohen ועמיתים, NIST)', license: 'MNIST: CC BY-SA 3.0; EMNIST: נתוני NIST; המודל עצמו MIT', url: 'https://www.nist.gov/itl/products-and-services/emnist-dataset' },
  { what: 'TensorFlow.js', who: 'Google', license: 'Apache-2.0', url: 'https://github.com/tensorflow/tfjs' },
  { what: 'React, Vite, Dexie, Framer Motion, React Router', who: 'הקהילות המתחזקות', license: 'MIT / Apache-2.0', url: 'https://github.com/shba/math_2th_grade/blob/main/package.json' },
]

export function CreditsScreen() {
  return (
    <Screen className="parent credits">
      <TopBar title="קרדיטים" back="/parent/dashboard" />
      <section className="panel">
        <p className="muted">תוכן הלימוד מבוסס על תוכנית הלימודים במתמטיקה לכיתה ב׳ של משרד החינוך.</p>
        <ul className="credit-list">
          {CREDITS.map((c) => (
            <li key={c.what}>
              <b>{c.what}</b>
              <span>{c.who}</span>
              <span className="muted">{c.license}</span>
              <a href={c.url} target="_blank" rel="noreferrer">{c.url.replace('https://', '')}</a>
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  )
}
