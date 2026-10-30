import { sortSlots } from '../data/academyRules'
import type { TimeSlot } from '../data/types'
import { WEEKDAY_NAMES, WEEKDAYS_FROM_MONDAY, type Weekday } from '../utils/date'

interface WeekdaySlotsEditorProps {
  /** 화면 읽기 프로그램에 읽어줄 이름. 예: '수업' */
  label: string
  slots: TimeSlot[]
  onChange(slots: TimeSlot[]): void
  /** 요일을 처음 고를 때 넣을 시간 */
  defaultStart: string
  defaultEnd: string
}

/** 요일을 고르고(월~일), 고른 요일마다 시작·끝 시각을 넣습니다. */
export default function WeekdaySlotsEditor({ label, slots, onChange, defaultStart, defaultEnd }: WeekdaySlotsEditorProps) {
  const sorted = sortSlots(slots)

  function toggle(weekday: Weekday) {
    if (slots.some((slot) => slot.weekday === weekday)) {
      onChange(slots.filter((slot) => slot.weekday !== weekday))
      return
    }
    // 새 요일은 마지막 요일의 시간을 그대로 씁니다. (월·수·금 같은 시간이 대부분이라서)
    const last = sorted[sorted.length - 1]
    onChange(sortSlots([...slots, { weekday, start: last?.start ?? defaultStart, end: last?.end ?? defaultEnd }]))
  }

  function update(weekday: Weekday, field: 'start' | 'end', value: string) {
    onChange(slots.map((slot) => (slot.weekday === weekday ? { ...slot, [field]: value } : slot)))
  }

  return (
    <div className="slots-editor">
      <div className="weekday-toggles" role="group" aria-label={`${label} 요일`}>
        {WEEKDAYS_FROM_MONDAY.map((weekday) => (
          <button key={weekday} type="button" className={`weekday-toggle wd-${weekday}`}
            aria-pressed={slots.some((slot) => slot.weekday === weekday)} onClick={() => toggle(weekday)}>
            {WEEKDAY_NAMES[weekday]}
          </button>
        ))}
      </div>
      {sorted.map((slot) => {
        const day = WEEKDAY_NAMES[slot.weekday]
        return (
          <div key={slot.weekday} className="slot-row">
            <span className="slot-day">{day}</span>
            <input type="time" className="input time-input" step={300} value={slot.start}
              onChange={(event) => update(slot.weekday, 'start', event.target.value)}
              aria-label={`${label} ${day}요일 시작 시각`} />
            <span aria-hidden="true">~</span>
            <input type="time" className="input time-input" step={300} value={slot.end}
              onChange={(event) => update(slot.weekday, 'end', event.target.value)}
              aria-label={`${label} ${day}요일 끝 시각`} />
          </div>
        )
      })}
    </div>
  )
}
