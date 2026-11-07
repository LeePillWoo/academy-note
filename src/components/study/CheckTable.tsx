import type { CSSProperties } from 'react'
import { softColorVars } from '../../data/colors'
import { isSubjectOnly, itemsOfSubject } from '../../data/study/items'
import { cellState, percent, progressOf } from '../../data/study/weekStats'
import { DayFootRow, DayHeadRow, SubjectLink } from './BoardRows'
import type { BoardTableProps } from './boardTypes'
import CheckCell from './CheckCell'

/**
 * 체크표: 과목 띠 아래 학습 내용이 한 줄씩 있고, 줄마다 월~일 체크 칸 7개가 있습니다.
 * 학습 내용이 없는 과목은 **과목 줄에 바로 체크 칸**이 생깁니다. (과목에서 고른 요일 기준)
 */
export default function CheckTable({ subjects, tasksOf, dates, todayStr, isDone, onToggle, dayTotals }: BoardTableProps) {
  return (
    <table className="board-table check-table">
      <colgroup>
        <col className="col-label" />
        <col span={7} />
      </colgroup>
      <thead className="board-head">
        <DayHeadRow dates={dates} todayStr={todayStr} cornerLabel="과목과 학습 내용" />
      </thead>
      {subjects.map((subject) => {
        const tasks = tasksOf(subject.id)
        const subjectOnly = isSubjectOnly(tasks)
        const items = itemsOfSubject(subject, tasks)
        const progress = progressOf(items, dates, isDone)
        return (
          <tbody key={subject.id} style={softColorVars(subject.color) as CSSProperties}>
            <tr className={subjectOnly ? 'subject-row is-checkable' : 'subject-row'}>
              <th scope={subjectOnly ? 'row' : 'rowgroup'} colSpan={subjectOnly ? 1 : 8}>
                <div className="subject-cell">
                  <SubjectLink subject={subject} />
                  {!subjectOnly && (
                    <span className="subject-progress">
                      <span>
                        {progress.done}/{progress.planned}
                      </span>
                      <span className="progress" aria-hidden="true">
                        <span style={{ transform: `scaleX(${percent(progress) / 100})` }} />
                      </span>
                    </span>
                  )}
                </div>
              </th>
              {subjectOnly &&
                dates.map((date) => {
                  const isToday = date === todayStr
                  return (
                    <td key={date} className={isToday ? 'is-today' : undefined}>
                      <CheckCell itemName={subject.name} date={date} isToday={isToday}
                        state={cellState(items[0], date, isDone(subject.id, date), todayStr)}
                        onToggle={() => onToggle(subject.id, date)} />
                    </td>
                  )
                })}
            </tr>
            {tasks.map((task) => (
              <tr key={task.id} className="task-row">
                <th scope="row">
                  <span className="task-name">{task.name}</span>
                </th>
                {dates.map((date) => {
                  const isToday = date === todayStr
                  return (
                    <td key={date} className={isToday ? 'is-today' : undefined}>
                      <CheckCell itemName={task.name} date={date} isToday={isToday}
                        state={cellState(task, date, isDone(task.id, date), todayStr)}
                        onToggle={() => onToggle(task.id, date)} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        )
      })}
      {dayTotals && (
        <tfoot className="board-foot">
          <DayFootRow dates={dates} todayStr={todayStr} dayTotals={dayTotals} />
        </tfoot>
      )}
    </table>
  )
}
