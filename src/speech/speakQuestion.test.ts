// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const playSamples = vi.fn(() => Promise.resolve())
const everyClip = new Proxy({}, { has: () => true, get: () => 'clip' }) as Record<string, string>

vi.mock('./clips', () => ({
  loadManifest: () => Promise.resolve(everyClip),
  stitch: () => Promise.resolve(new Float32Array(10)),
  playSamples,
  stopPlayer: () => {},
  unlockPlayer: () => {},
  downloadAll: () => Promise.resolve(0),
}))
vi.mock('./webSpeech', () => ({
  cancelWebSpeech: () => {},
  unlockWebSpeech: () => {},
  webSpeak: () => Promise.resolve(),
  hebrewVoices: () => [],
  waitForVoices: () => Promise.resolve([]),
}))

const { getSpeechSettings, saveSpeechSettings, speak, speakQuestion } = await import('./speech')

describe('speakQuestion', () => {
  beforeEach(() => playSamples.mockClear())

  it('is off by default: a new question is read only from the speaker button', async () => {
    expect(getSpeechSettings().autoReadQuestions).toBe(false)
    await speakQuestion('כַּמָּה זֶה 3 וְעוֹד 4?')
    expect(playSamples).not.toHaveBeenCalled()
    await speak('כַּמָּה זֶה 3 וְעוֹד 4?')
    expect(playSamples).toHaveBeenCalledTimes(1)
  })

  it('reads the question when the parent turns automatic reading on', async () => {
    saveSpeechSettings({ autoReadQuestions: true })
    await speakQuestion('כַּמָּה זֶה 3 וְעוֹד 4?')
    expect(playSamples).toHaveBeenCalledTimes(1)
    saveSpeechSettings({ autoReadQuestions: false })
  })
})
