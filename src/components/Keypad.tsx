export function Keypad({ onDigit, onBack, disabled }: { onDigit: (d: number) => void; onBack: () => void; disabled?: boolean }) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  return (
    <div className="keypad" dir="ltr" role="group" aria-label="מקלדת מספרים">
      {keys.map((k) => (
        <button key={k} type="button" className="key" disabled={disabled} onClick={() => onDigit(k)}>
          {k}
        </button>
      ))}
      <button type="button" className="key key-back" disabled={disabled} onClick={onBack} aria-label="מחק">
        ⌫
      </button>
      <button type="button" className="key" disabled={disabled} onClick={() => onDigit(0)}>
        0
      </button>
      <span />
    </div>
  )
}
