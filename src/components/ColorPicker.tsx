import type { CSSProperties } from 'react'
import { PALETTE } from '../data/colors'

interface ColorPickerProps {
  name: string
  value: string
  onChange(value: string): void
}

/** 색 동그라미 중에서 하나를 고릅니다. 고른 색에는 체크 표시가 붙습니다. */
export default function ColorPicker({ name, value, onChange }: ColorPickerProps) {
  return (
    <div className="color-picker">
      {PALETTE.map((color) => (
        <input
          key={color.value}
          type="radio"
          className="swatch"
          name={name}
          value={color.value}
          checked={value === color.value}
          onChange={() => onChange(color.value)}
          aria-label={color.name}
          title={color.name}
          style={{ '--swatch': color.value } as CSSProperties}
        />
      ))}
    </div>
  )
}
