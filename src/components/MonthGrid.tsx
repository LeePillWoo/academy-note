import { WEEKDAY_NAMES, dateParts, daysInMonth, formatDate, makeDate, today, weekdayOf, type DateStr } from '../utils/date'

interface MonthGridProps {
  /** 보여줄 달의 아무 날짜 */
  month: DateStr
  selected?: DateStr
  /** 이 날짜보다 앞은 고를 수 없습니다. */
  min?: DateStr
  onSelect(date: DateStr): void
}

/** 한 달 달력 (일요일부터). 날짜를 누르면 고릅니다. */
export default function MonthGrid({ month, selected, min, onSelect }: MonthGridProps) {
  const { year, month: monthNumber } = dateParts(month)
  const firstWeekday = weekdayOf(makeDate(year, monthNumber, 1))
  const todayStr = today()
  const cells: (DateStr | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth(year, monthNumber) }, (_, i) => makeDate(year, monthNumber, i + 1)),
  ]

  return (
    <div className="month-grid">
      {WEEKDAY_NAMES.map((name, index) => (
        <div key={name} className={`month-weekday wd-${index}`} aria-hidden="true">
          {name}
        </div>
      ))}
      {cells.map((date, index) =>
        date === null ? (
          <div key={`blank-${index}`} />
        ) : (
          <button
            key={date}
            type="button"
            className={`day wd-${weekdayOf(date)}${date === todayStr ? ' is-today' : ''}`}
            aria-pressed={date === selected}
            aria-label={formatDate(date, { withYear: true })}
            disabled={min !== undefined && date < min}
            onClick={() => onSelect(date)}
          >
            {dateParts(date).day}
          </button>
        ),
      )}
    </div>
  )
}
