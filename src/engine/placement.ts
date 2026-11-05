import type { TopicId } from '../exercises/types'
import { levelCount } from './adaptive'

export const PLACEMENT_TOPICS: TopicId[] = ['add-sub-20', 'numbers-1000', 'add-sub-100']
export const PLACEMENT_DIFFICULTY = 2
export const QUESTIONS_PER_LEVEL = 2

export interface PlacementState {
  topicIdx: number
  level: number
  asked: number
  results: Partial<Record<TopicId, number>>
  done: boolean
  total: number
}

export const startPlacement = (): PlacementState => ({ topicIdx: 0, level: 1, asked: 0, results: {}, done: false, total: 0 })

function nextTopic(s: PlacementState): PlacementState {
  let idx = s.topicIdx + 1
  // Two-digit arithmetic builds on facts to 20; skip it if those are not solid yet.
  if (PLACEMENT_TOPICS[idx] === 'add-sub-100' && (s.results['add-sub-20'] ?? 0) < 2) {
    s.results['add-sub-100'] = 0
    idx++
  }
  if (idx >= PLACEMENT_TOPICS.length) return { ...s, done: true }
  return { ...s, topicIdx: idx, level: 1, asked: 0 }
}

/** Each level needs every question right; a miss ends that topic at the previous level. */
export function answerPlacement(state: PlacementState, correct: boolean): PlacementState {
  const topic = PLACEMENT_TOPICS[state.topicIdx]
  const s: PlacementState = { ...state, results: { ...state.results }, asked: state.asked + 1, total: state.total + 1 }
  if (!correct) {
    s.results[topic] = state.level - 1
    return nextTopic(s)
  }
  if (s.asked < QUESTIONS_PER_LEVEL) return s
  s.results[topic] = state.level
  if (state.level >= levelCount(topic)) return nextTopic(s)
  return { ...s, level: state.level + 1, asked: 0 }
}

export const currentPlacementTopic = (s: PlacementState) => PLACEMENT_TOPICS[s.topicIdx]

/** Upper bound on questions, for the progress bar. */
export const placementMax = () => PLACEMENT_TOPICS.reduce((n, t) => n + levelCount(t) * QUESTIONS_PER_LEVEL, 0)
