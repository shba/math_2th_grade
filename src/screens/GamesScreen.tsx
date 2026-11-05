import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useGuide } from '../app/useGuide'
import { Character } from '../components/Characters'
import { Confetti, Screen, TopBar } from '../components/Chrome'
import { g } from '../content/he/text'
import { TOPICS } from '../curriculum/topics'
import type { TopicId } from '../exercises/types'
import { CastleGame } from '../games/CastleGame'
import { FeedGame } from '../games/FeedGame'
import { RaceGame } from '../games/RaceGame'
import { gameById, GAMES } from '../games/registry'
import { TargetGame } from '../games/TargetGame'
import { speak } from '../speech/speech'

export function GamesHub() {
  const nav = useNavigate()
  const { t } = useApp()
  useEffect(() => void speak(t(g('בַּחֲרִי מִשְׂחָק!', 'בְּחַר מִשְׂחָק!'))), [t])
  return (
    <Screen className="games-hub">
      <TopBar title="מִשְׂחָקִים" />
      <div className="game-grid">
        {GAMES.map((gm) => (
          <button key={gm.id} type="button" className="game-card" onClick={() => nav(`/games/${gm.id}`)}>
            <span className="game-emoji" aria-hidden>{gm.emoji}</span>
            <span className="game-name">{gm.name}</span>
            <span className="game-about">{gm.about}</span>
          </button>
        ))}
      </div>
    </Screen>
  )
}

export function GamePlay() {
  const { gameId } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { t } = useApp()
  const { pet } = useGuide()
  const game = gameById(gameId ?? '')
  const topicParam = params.get('topic') as TopicId | null
  const topicId: TopicId = topicParam && TOPICS.some((x) => x.id === topicParam) ? topicParam : 'add-sub-20'
  const [result, setResult] = useState<{ score: number; total: number; extra?: string } | null>(null)
  const [key, setKey] = useState(0)
  const back = topicParam ? `/topic/${topicParam}` : '/games'

  useEffect(() => {
    if (result) void speak([t(g('אֵיזֶה יֹפִי שֶׁל מִשְׂחָק! הִתְאַמַּצְתְּ מְאוֹד.', 'אֵיזֶה יֹפִי שֶׁל מִשְׂחָק! הִתְאַמַּצְתָּ מְאוֹד.')), result.extra ?? ''])
  }, [result, t])

  if (!game) return null
  const onEnd = (score: number, total: number, extra?: string) => setResult({ score, total, extra })

  return (
    <Screen className={`game-screen fit game-${game.id}`}>
      <TopBar title={<span><span aria-hidden>{game.emoji}</span> {game.name}</span>} back={back} />
      {result ? (
        <div className="game-end">
          <Confetti />
          <Character kind={pet} size={140} mood="cheer" />
          <p className="title">{t(g('כׇּל הַכָּבוֹד!', 'כׇּל הַכָּבוֹד!'))}</p>
          <p className="score" aria-label={`${result.score} מתוך ${result.total} בניסיון הראשון`}>
            {'⭐'.repeat(Math.max(1, Math.round((result.score / result.total) * 5)))}
          </p>
          {result.extra && <p className="subtitle"><bdi>{result.extra}</bdi></p>}
          <div className="actions">
            <button type="button" className="btn primary big" onClick={() => { setResult(null); setKey(key + 1) }}>🔁 עוֹד פַּעַם</button>
            <button type="button" className="btn ghost big" onClick={() => nav(back)}>→ חֲזָרָה</button>
          </div>
        </div>
      ) : game.id === 'feed' ? (
        <FeedGame key={key} topicId={topicId} onEnd={onEnd} />
      ) : game.id === 'castle' ? (
        <CastleGame key={key} onEnd={onEnd} />
      ) : game.id === 'race' ? (
        <RaceGame key={key} onEnd={onEnd} />
      ) : (
        <TargetGame key={key} topicId={topicParam === 'add-sub-100' ? 'add-sub-100' : 'add-sub-20'} onEnd={onEnd} />
      )}
    </Screen>
  )
}
