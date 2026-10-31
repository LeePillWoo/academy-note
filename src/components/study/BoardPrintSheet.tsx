import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useChecks } from '../../data/study/checks'
import { useSubjects } from '../../data/study/subjects'
import { useTasks } from '../../data/study/tasks'
import type { Child, Subject, StudyTask } from '../../data/types'
import { dayItems } from '../../data/study/weekStats'
import { WEEKDAY_NAMES, dateParts, weekdayOf, type DateStr } from '../../utils/date'
import { formatWeekRange, weekDates } from '../../utils/week'
import type { BoardView } from './boardTypes'

interface BoardPrintSheetProps {
  child: Child
  weekStart: DateStr
  view: BoardView
}

interface PrintTableProps {
  subjects: Subject[]
  tasksOf(subjectId: string): StudyTask[]
  dates: DateStr[]
  isDone(taskId: string, date: DateStr): boolean
}

/**
 * 인쇄용 주간표 (A4 한 장). 화면에서는 숨겨져 있다가 인쇄할 때만 보입니다. (index.css의 '학습 인쇄')
 * 보고 있는 표를 그대로 인쇄합니다.
 * - 계획표: 과목 줄과 칸 안의 학습 내용 (A4 가로)
 * - 요일별: 요일 줄과 과목 열, 칸 안의 학습 내용 (A4 세로)
 * - 체크표: 학습 내용 줄과 체크 칸 (A4 가로)
 * 체크한 칸은 채워서 나오므로, 주 초에 뽑으면 손으로 체크할 빈 표가 되고 주 중간에 뽑으면 진행 상황이 나옵니다.
 */
export default function BoardPrintSheet({ child, weekStart, view }: BoardPrintSheetProps) {
  const { subjects } = useSubjects(child.id)
  const { tasksOf } = useTasks()
  const { isDone } = useChecks()
  const props: PrintTableProps = { subjects, tasksOf, dates: weekDates(weekStart), isDone }

  return createPortal(
    <div className={view === 'days' ? 'print-sheet is-study is-portrait' : 'print-sheet is-study'} aria-hidden="true">
      <header className="print-head">
        <h1>{view === 'check' ? '주간 학습 체크표' : '주간 학습 계획표'}</h1>
        <p>
          {child.name} · {formatWeekRange(weekStart)} · 학원노트
        </p>
      </header>
      {view === 'plan' && <PrintPlan {...props} />}
      {view === 'days' && <PrintByDay {...props} />}
      {view === 'check' && <PrintCheck {...props} />}
      {subjects.length === 0 && <p className="print-empty">과목이 없습니다.</p>}
    </div>,
    document.body,
  )
}

/** 요일 머리 칸: '월' 아래에 '10/26' */
function DayLabel({ date }: { date: DateStr }) {
  const { month, day } = dateParts(date)
  return (
    <>
      {WEEKDAY_NAMES[weekdayOf(date)]}
      <span className="print-day-date">
        {month}/{day}
      </span>
    </>
  )
}

function DayHeads({ dates, label }: { dates: DateStr[]; label: string }) {
  return (
    <thead>
      <tr>
        <th>{label}</th>
        {dates.map((date) => (
          <th key={date} className={`wd-${weekdayOf(date)}`}>
            <DayLabel date={date} />
          </th>
        ))}
      </tr>
    </thead>
  )
}

/** 칸 안의 학습 내용 목록: 체크 네모와 이름 */
function PrintItems({ tasks, date, isDone }: { tasks: StudyTask[]; date: DateStr; isDone: PrintTableProps['isDone'] }) {
  return (
    <>
      {dayItems(tasks, date, isDone).map((task) => (
        <div key={task.id} className="print-item">
          <PrintBox done={isDone(task.id, date)} />
          <span>{task.name}</span>
        </div>
      ))}
    </>
  )
}

/** 계획표: 왼쪽 과목, 위 요일 */
function PrintPlan({ subjects, tasksOf, dates, isDone }: PrintTableProps) {
  return (
    <table className="print-table print-plan">
      <colgroup>
        <col className="print-col-label" />
        <col span={7} />
      </colgroup>
      <DayHeads dates={dates} label="과목" />
      <tbody>
        {subjects.map((subject) => (
          <tr key={subject.id} style={{ '--c': subject.color } as CSSProperties}>
            <th className="print-subject">{subject.name}</th>
            {dates.map((date) => (
              <td key={date}>
                <PrintItems tasks={tasksOf(subject.id)} date={date} isDone={isDone} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** 요일별: 왼쪽 요일, 위 과목 */
function PrintByDay({ subjects, tasksOf, dates, isDone }: PrintTableProps) {
  return (
    <table className="print-table print-byday">
      <colgroup>
        <col className="print-col-day" />
        <col span={subjects.length} />
      </colgroup>
      <thead>
        <tr>
          <th>요일</th>
          {subjects.map((subject) => (
            <th key={subject.id} className="print-subject-head" style={{ '--c': subject.color } as CSSProperties}>
              {subject.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dates.map((date) => (
          <tr key={date}>
            <th className={`print-day wd-${weekdayOf(date)}`}>
              <DayLabel date={date} />
            </th>
            {subjects.map((subject) => (
              <td key={subject.id} style={{ '--c': subject.color } as CSSProperties}>
                <PrintItems tasks={tasksOf(subject.id)} date={date} isDone={isDone} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** 체크표: 학습 내용 줄마다 네모 7개. 계획 없는 요일은 작은 점 */
function PrintCheck({ subjects, tasksOf, dates, isDone }: PrintTableProps) {
  return (
    <table className="print-table print-check">
      <colgroup>
        <col className="print-col-label" />
        <col span={7} />
      </colgroup>
      <DayHeads dates={dates} label="학습 내용" />
      {subjects.map((subject) => (
        <tbody key={subject.id} style={{ '--c': subject.color } as CSSProperties}>
          <tr className="print-band">
            <th colSpan={8}>{subject.name}</th>
          </tr>
          {tasksOf(subject.id).map((task) => (
            <tr key={task.id}>
              <th className="print-task">{task.name}</th>
              {dates.map((date) => {
                const planned = task.weekdays.includes(weekdayOf(date))
                const done = isDone(task.id, date)
                return <td key={date}>{planned || done ? <PrintBox done={done} /> : <span className="print-dot" />}</td>
              })}
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  )
}

/** 체크 네모. 체크한 것은 과목 색으로 채우고 흰 체크 표시 */
function PrintBox({ done }: { done: boolean }) {
  return (
    <span className={done ? 'print-box is-done' : 'print-box'}>
      {done && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      )}
    </span>
  )
}
