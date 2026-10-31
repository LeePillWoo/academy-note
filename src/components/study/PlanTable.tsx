import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { softColorVars } from '../../data/colors'
import { cellState, dayItems, progressOf } from '../../data/study/weekStats'
import { DayFootRow, DayHeadRow, SubjectLink } from './BoardRows'
import type { BoardTableProps } from './boardTypes'
import PlanItem from './PlanItem'

/**
 * 계획표: 종이에 그리는 주간 계획표처럼 왼쪽에 과목, 위에 요일, 칸 안에 그날 할 학습 내용을 적습니다.
 * 학습 내용을 누르면 체크됩니다. 칸이 넓어야 해서 좁은 화면에서는 옆으로 밀어서 보고, 과목 열은 왼쪽에 붙어 있습니다.
 * (요일과 과목 위치를 바꾼 것은 DayPlanTable)
 */
export default function PlanTable({ subjects, tasksOf, dates, todayStr, isDone, onToggle, dayTotals }: BoardTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)

  // 표가 화면보다 넓으면 안내 글을 보여주고, 오늘 열이 보이도록 옆으로 밀어 둡니다.
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const update = () => {
      const wide = container.scrollWidth > container.clientWidth + 1
      setOverflowing(wide)
      if (!wide) return
      const todayHead = container.querySelector<HTMLElement>('thead th.is-today')
      const corner = container.querySelector<HTMLElement>('thead th.plan-corner')
      // 오늘 열의 왼쪽이 고정된 과목 열 바로 오른쪽에 오도록 (앞 요일 칸이 살짝 보이지 않게)
      if (todayHead && corner) container.scrollLeft = Math.max(0, todayHead.offsetLeft - corner.offsetWidth)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    return () => observer.disconnect()
  }, [dates])

  return (
    <div className="plan-wrap">
      <div ref={scrollRef} className="plan-scroll">
        <table className="board-table plan-table">
          <colgroup>
            <col className="col-label" />
            <col span={7} />
          </colgroup>
          <thead className="board-head">
            <DayHeadRow dates={dates} todayStr={todayStr} cornerLabel="과목" cornerClassName="plan-corner" />
          </thead>
          <tbody>
            {subjects.map((subject) => {
              const tasks = tasksOf(subject.id)
              const progress = progressOf(tasks, dates, isDone)
              return (
                <tr key={subject.id} className="plan-row" style={softColorVars(subject.color) as CSSProperties}>
                  <th scope="row" className="plan-subject">
                    <SubjectLink subject={subject} />
                    <span className="plan-subject-sub">
                      {tasks.length === 0 ? '학습 내용 없음' : `${progress.done}/${progress.planned}`}
                    </span>
                  </th>
                  {dates.map((date) => {
                    const isToday = date === todayStr
                    const items = dayItems(tasks, date, isDone)
                    return (
                      <td key={date} className={isToday ? 'plan-cell is-today' : 'plan-cell'}>
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
          {dayTotals && (
            <tfoot className="board-foot">
              <DayFootRow dates={dates} todayStr={todayStr} dayTotals={dayTotals} labelClassName="plan-foot-label" />
            </tfoot>
          )}
        </table>
      </div>
      {overflowing && <p className="muted plan-hint">옆으로 밀어서 다른 요일을 볼 수 있습니다.</p>}
    </div>
  )
}
