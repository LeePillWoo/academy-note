import { WEEKDAY_NAMES, WEEKDAYS_FROM_MONDAY, sortWeekdays, type Weekday } from '../../utils/date'

interface WeekdayPickerProps {
  /** 화면 읽기 프로그램에 읽어줄 이름. 예: '학습 내용 1' */
  label: string
  value: Weekday[]
  onChange(value: Weekday[]): void
}

/** 월~일 요일 단추. 누르면 계획 요일을 켜고 끕니다. */
export default function WeekdayPicker({ label, value, onChange }: WeekdayPickerProps) {
  function toggle(weekday: Weekday) {
    onChange(value.includes(weekday) ? value.filter((day) => day !== weekday) : sortWeekdays([...value, weekday]))
  }

  return (
    <div className="weekday-toggles" role="group" aria-label={`${label} 요일`}>
      {WEEKDAYS_FROM_MONDAY.map((weekday) => (
        <button key={weekday} type="button" className={`weekday-toggle wd-${weekday}`}
          aria-pressed={value.includes(weekday)} onClick={() => toggle(weekday)}>
          {WEEKDAY_NAMES[weekday]}
        </button>
      ))}
    </div>
  )
}
