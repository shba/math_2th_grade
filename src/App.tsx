import { Fragment, useState } from 'react'
import { HashRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppProvider, useApp } from './app/AppContext'
import { BadgesScreen } from './screens/BadgesScreen'
import { GamePlay, GamesHub } from './screens/GamesScreen'
import { LessonScreen } from './screens/LessonScreen'
import { LevelTestScreen } from './screens/LevelTestScreen'
import { MapScreen } from './screens/MapScreen'
import { NewProfileScreen } from './screens/NewProfileScreen'
import { CreditsScreen } from './screens/parent/CreditsScreen'
import { ParentDashboard } from './screens/parent/ParentDashboard'
import { ParentGate } from './screens/parent/ParentGate'
import { PlacementScreen } from './screens/PlacementScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { ProfilesScreen } from './screens/ProfilesScreen'
import { StartScreen } from './screens/StartScreen'
import { TopicScreen } from './screens/TopicScreen'

function NeedsProfile({ children }: { children: React.ReactNode }) {
  const { profileId } = useApp()
  return profileId ? children : <Navigate to="/profiles" replace />
}

/** Remounts the screen when its topic or game changes, so no state carries over between them. */
function PerParam({ children }: { children: React.ReactNode }) {
  const { topicId, gameId } = useParams()
  return <Fragment key={topicId ?? gameId}>{children}</Fragment>
}

function NoVoiceBanner() {
  const [shown, setShown] = useState(() => sessionStorage.getItem('mk-no-voice') === '1')
  if (!shown) return null
  return (
    <div className="banner warn top" role="status">
      <span>להורים: לא נמצא קול עברי במכשיר, ולכן ההקראה לא תעבוד. <Link to="/parent">הוראות התקנה באזור ההורים</Link></span>
      <button type="button" className="icon-btn small" onClick={() => { sessionStorage.removeItem('mk-no-voice'); setShown(false) }} aria-label="סגירה">✕</button>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <NoVoiceBanner />
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/profiles" element={<ProfilesScreen />} />
          <Route path="/new" element={<NewProfileScreen />} />
          <Route path="/placement" element={<NeedsProfile><PlacementScreen /></NeedsProfile>} />
          <Route path="/map" element={<NeedsProfile><MapScreen /></NeedsProfile>} />
          <Route path="/topic/:topicId" element={<NeedsProfile><PerParam><TopicScreen /></PerParam></NeedsProfile>} />
          <Route path="/lesson/:topicId" element={<NeedsProfile><PerParam><LessonScreen /></PerParam></NeedsProfile>} />
          <Route path="/practice/:topicId" element={<NeedsProfile><PerParam><PracticeScreen /></PerParam></NeedsProfile>} />
          <Route path="/test/:topicId" element={<NeedsProfile><PerParam><LevelTestScreen /></PerParam></NeedsProfile>} />
          <Route path="/badges" element={<NeedsProfile><BadgesScreen /></NeedsProfile>} />
          <Route path="/games" element={<NeedsProfile><GamesHub /></NeedsProfile>} />
          <Route path="/games/:gameId" element={<NeedsProfile><PerParam><GamePlay /></PerParam></NeedsProfile>} />
          <Route path="/parent" element={<ParentGate />} />
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
          <Route path="/parent/credits" element={<CreditsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
