import { Link } from 'react-router'
import type { Subject } from '../../data/types'
import type { Progress } from '../../data/study/weekStats'
import { WEEKDAY_NAMES, dateParts, formatDate, weekdayOf, type DateStr } from '../../utils/date'
import { ChevronRightIcon } from '../icons'

/** 요일 줄: 왼쪽 모서리 칸과 월~일. 오늘은 남색 동그라미 */
export function DayHeadRow({ dates, todayStr, cornerLabel, cornerClassName }: {
  dates: DateStr[]
  todayStr: DateStr
  /** 화면 읽기 프로그램에 읽어줄 왼쪽 열 이름 */
  cornerLabel: string
  cornerClassName?: string
}) {
  return (
    <tr>
      <th scope="col" className={cornerClassName}>
        <span className="visually-hidden">{cornerLabel}</span>
      </th>
      {dates.map((date) => {
        const weekday = weekdayOf(date)
        const isToday = date === todayStr
        return (
          <th key={date} scope="col" className={`wd-${weekday}${isToday ? ' is-today' : ''}`}
            aria-label={`${formatDate(date)}${isToday ? ' 오늘' : ''}`}>
            <span className="day-head">
              <span className="day-name">{WEEKDAY_NAMES[weekday]}</span>
              <span className="day-num">{dateParts(date).day}</span>
            </span>
          </th>
        )
      })}
    </tr>
  )
}

/** 아래 줄: 요일마다 완료/계획 수 */
export function DayFootRow({ dates, todayStr, dayTotals, labelClassName }: {
  dates: DateStr[]
  todayStr: DateStr
  dayTotals: Progress[]
  labelClassName?: string
}) {
  return (
    <tr>
      <th scope="row" className={labelClassName}>완료</th>
      {dayTotals.map((progress, index) => (
        <td key={dates[index]} className={dates[index] === todayStr ? 'is-today' : undefined}>
          {progress.done}/{progress.planned}
        </td>
      ))}
    </tr>
  )
}

/** 과목 이름. 누르면 과목 설정 화면으로 갑니다. */
export function SubjectLink({ subject }: { subject: Subject }) {
  return (
    <Link to={`/study/subjects/${subject.id}`} className="subject-link" aria-label={`${subject.name} 과목 설정`}>
      <span className="dot" style={{ background: subject.color }} />
      <span className="subject-name">{subject.name}</span>
      <ChevronRightIcon />
    </Link>
  )
}
