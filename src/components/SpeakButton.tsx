import { speak } from '../speech/speech'

export function SpeakButton({ text, label = 'הקראה' }: { text: string | string[]; label?: string }) {
  return (
    <button type="button" className="speak-btn" onClick={() => void speak(text)} aria-label={label}>
      <span aria-hidden>🔊</span>
    </button>
  )
}
