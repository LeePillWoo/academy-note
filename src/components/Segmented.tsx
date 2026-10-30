import type { ReactNode } from 'react'

interface SegmentedProps<T extends string> {
  /** 화면 읽기 프로그램에 읽어줄 이름 */
  label: string
  name: string
  /** null이면 아무것도 고르지 않은 상태 */
  value: T | null
  options: { value: T; label: ReactNode }[]
  onChange(value: T): void
}

/** 여러 개 중 하나를 고르는 단추 묶음. 예: [월 단위 | 회차 단위 | 기간 단위] */
export default function Segmented<T extends string>({ label, name, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <label key={option.value} className="segment">
          <input type="radio" name={name} value={option.value} checked={value === option.value}
            onChange={() => onChange(option.value)} />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
