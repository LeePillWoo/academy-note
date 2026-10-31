import type { CSSProperties } from 'react'
import { softColorVars } from '../../data/colors'
import { cellState, percent, progressOf } from '../../data/study/weekStats'
import { DayFootRow, DayHeadRow, SubjectLink } from './BoardRows'
import type { BoardTableProps } from './boardTypes'
import CheckCell from './CheckCell'

/**
 * 체크표 (기본 보기): 과목 띠 아래 학습 내용이 한 줄씩 있고, 줄마다 월~일 체크 칸 7개가 있습니다.
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
        const progress = progressOf(tasks, dates, isDone)
        return (
          <tbody key={subject.id} style={softColorVars(subject.color) as CSSProperties}>
            <tr className="subject-row">
              <th scope="rowgroup" colSpan={8}>
                <div className="subject-cell">
                  <SubjectLink subject={subject} />
                  {tasks.length > 0 && (
                    <span className="subject-progress">
                      <span>
                        {progress.done}/{progress.planned}
                      </span>
                      <span className="progress" aria-hidden="true">
                        <span style={{ width: `${percent(progress)}%` }} />
                      </span>
                    </span>
                  )}
                </div>
              </th>
            </tr>
            {tasks.length === 0 ? (
              <tr className="empty-row">
                <th scope="row" colSpan={8}>
                  학습 내용이 없습니다. 과목 이름을 눌러 추가하세요.
                </th>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="task-row">
                  <th scope="row">
                    <span className="task-name">{task.name}</span>
                  </th>
                  {dates.map((date) => {
                    const isToday = date === todayStr
                    return (
                      <td key={date} className={isToday ? 'is-today' : undefined}>
                        <CheckCell taskName={task.name} date={date} isToday={isToday}
                          state={cellState(task, date, isDone(task.id, date), todayStr)}
                          onToggle={() => onToggle(task.id, date)} />
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
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
