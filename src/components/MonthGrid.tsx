import type { ReactNode } from 'react'
import { WEEKDAY_NAMES, dateParts, daysInMonth, formatDate, makeDate, today, weekdayOf, type DateStr } from '../utils/date'

interface MonthGridProps {
  /** 보여줄 달의 아무 날짜 */
  month: DateStr
  selected?: DateStr
  /** 이 날짜보다 앞은 고를 수 없습니다. */
  min?: DateStr
  onSelect(date: DateStr): void
  /** 날짜 숫자 아래에 넣을 내용 (달력 화면의 일정 칩) */
  renderDay?(date: DateStr): ReactNode
  /** 화면 읽기 프로그램에 날짜와 함께 읽어줄 내용. 예: '수학학원, 피아노' */
  describeDay?(date: DateStr): string | undefined
  className?: string
}

/** 한 달 달력 (일요일부터). 날짜를 누르면 고릅니다. 마지막 주의 남는 칸도 채워 격자를 맞춥니다. */
export default function MonthGrid({ month, selected, min, onSelect, renderDay, describeDay, className }: MonthGridProps) {
  const { year, month: monthNumber } = dateParts(month)
  const firstWeekday = weekdayOf(makeDate(year, monthNumber, 1))
  const todayStr = today()
  const days = Array.from({ length: daysInMonth(year, monthNumber) }, (_, i) => makeDate(year, monthNumber, i + 1))
  const trailing = (7 - ((firstWeekday + days.length) % 7)) % 7
  const cells: (DateStr | null)[] = [...Array<null>(firstWeekday).fill(null), ...days, ...Array<null>(trailing).fill(null)]

  return (
    <div className={className ? `month-grid ${className}` : 'month-grid'}>
      <div className="month-weekdays" aria-hidden="true">
        {WEEKDAY_NAMES.map((name, index) => (
          <div key={name} className={`month-weekday wd-${index}`}>
            {name}
          </div>
        ))}
      </div>
      <div className="month-days">
        {cells.map((date, index) => {
          if (date === null) return <div key={`blank-${index}`} className="day-blank" />
          const description = describeDay?.(date)
          return (
            <button
              key={date}
              type="button"
              className={`day wd-${weekdayOf(date)}${date === todayStr ? ' is-today' : ''}`}
              aria-pressed={date === selected}
              aria-label={[formatDate(date, { withYear: true }), date === todayStr && '오늘', description].filter(Boolean).join(', ')}
              disabled={min !== undefined && date < min}
              onClick={() => onSelect(date)}
            >
              <span className="day-number">{dateParts(date).day}</span>
              {renderDay?.(date)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
