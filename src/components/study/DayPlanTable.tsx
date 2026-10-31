import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { softColorVars } from '../../data/colors'
import { cellState, dayItems, progressOf } from '../../data/study/weekStats'
import { WEEKDAY_NAMES, dateParts, formatDate, weekdayOf } from '../../utils/date'
import { SubjectLink } from './BoardRows'
import type { BoardTableProps } from './boardTypes'
import PlanItem from './PlanItem'

/** 과목 열 하나의 최소 너비(rem). 화면이 이보다 좁으면 표 안에서 옆으로 밀어서 봅니다. (360px 휴대폰 세로에 과목 4개까지 들어감) */
const MIN_SUBJECT_REM = 3.5
/** 어차피 옆으로 밀어야 할 때의 과목 열 너비(rem). 조금 넓게 둬서 학습 내용 글자가 덜 끊기게 합니다. */
const SCROLL_SUBJECT_REM = 4.5

/**
 * 요일별 계획표 (기본 보기): 계획표의 요일과 과목 위치를 바꾼 보기입니다. 왼쪽에 월~일, 위에 과목, 칸 안에 그날 할 학습 내용.
 * 요일이 세로로 내려가서 휴대폰에서도 옆으로 밀지 않고 한 주를 위아래로 훑어봅니다.
 * - 과목이 화면에 다 들어가면: 표가 화면 너비에 맞고, 과목 줄이 스크롤해도 위에 붙어 따라옵니다.
 * - 과목이 많아 다 안 들어가면: 표 안에서 옆으로 밀어서 보고, 요일 열은 왼쪽에 붙어 있습니다.
 */
export default function DayPlanTable({ subjects, tasksOf, dates, todayStr, isDone, onToggle, dayTotals }: BoardTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const cornerRef = useRef<HTMLTableCellElement>(null)
  // 옆으로 밀어야 할 때 표의 최소 너비(px). null이면 화면 너비에 맞춤
  const [minWidth, setMinWidth] = useState<number | null>(null)
  const count = subjects.length

  // 그리기 전에 과목 수와 화면 너비를 비교해 배치를 정합니다. (화면 크기가 바뀌면 다시)
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const update = () => {
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const corner = cornerRef.current?.offsetWidth ?? 0
      const fits = container.clientWidth + 1 >= corner + count * MIN_SUBJECT_REM * rootPx
      setMinWidth(fits ? null : Math.ceil(corner + count * SCROLL_SUBJECT_REM * rootPx))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    return () => observer.disconnect()
  }, [count])

  return (
    <div className="plan-wrap">
      <div ref={scrollRef} className={minWidth ? 'dayplan-scroll is-scrolling' : 'dayplan-scroll'}>
        <table className="board-table dayplan-table" style={minWidth ? { minWidth } : undefined}>
          <colgroup>
            <col className="col-day" />
            <col span={count} />
          </colgroup>
          <thead className="board-head">
            <tr>
              <th ref={cornerRef} scope="col" className="dayplan-corner">
                <span className="visually-hidden">요일</span>
              </th>
              {subjects.map((subject) => {
                const tasks = tasksOf(subject.id)
                const progress = progressOf(tasks, dates, isDone)
                return (
                  <th key={subject.id} scope="col" className="dayplan-subject" style={softColorVars(subject.color) as CSSProperties}>
                    <SubjectLink subject={subject} />
                    <span className="plan-subject-sub">
                      {tasks.length === 0 ? '학습 내용 없음' : `${progress.done}/${progress.planned}`}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {dates.map((date, index) => {
              const weekday = weekdayOf(date)
              const isToday = date === todayStr
              const total = dayTotals?.[index]
              return (
                <tr key={date} className={isToday ? 'dayplan-row is-today' : 'dayplan-row'}>
                  <th scope="row" className={`dayplan-day wd-${weekday}${isToday ? ' is-today' : ''}`}
                    aria-label={`${formatDate(date)}${isToday ? ' 오늘' : ''}${total ? `, ${total.done}/${total.planned} 완료` : ''}`}>
                    <span className="day-head">
                      <span className="day-name">{WEEKDAY_NAMES[weekday]}</span>
                      <span className="day-num">{dateParts(date).day}</span>
                      {total && (
                        <span className="dayplan-day-total">
                          {total.done}/{total.planned}
                        </span>
                      )}
                    </span>
                  </th>
                  {subjects.map((subject) => {
                    const items = dayItems(tasksOf(subject.id), date, isDone)
                    return (
                      <td key={subject.id} className="plan-cell" style={softColorVars(subject.color) as CSSProperties}>
                        {items.length > 0 && (
                          <div className="plan-items">
                            {items.map((task) => (
                              <PlanItem key={task.id} task={task} date={date} isToday={isToday}
                                state={cellState(task, date, isDone(task.id, date), todayStr)}
                                onToggle={() => onToggle(task.id, date)} />
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {minWidth && <p className="muted plan-hint">옆으로 밀어서 다른 과목을 볼 수 있습니다.</p>}
    </div>
  )
}
