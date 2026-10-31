import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useChecks } from '../../data/study/checks'
import { useSubjects } from '../../data/study/subjects'
import { useTasks } from '../../data/study/tasks'
import type { Child } from '../../data/types'
import { percent, progressOf } from '../../data/study/weekStats'
import { addDays, today, type DateStr } from '../../utils/date'
import { formatWeekRange, startOfWeek, weekDates } from '../../utils/week'
import type { BoardView } from './boardTypes'
import CheckTable from './CheckTable'
import DayPlanTable from './DayPlanTable'
import { BackIcon, ChevronRightIcon, PlusIcon } from '../icons'
import PlanTable from './PlanTable'

interface WeekBoardProps {
  child: Child
  /** 보여줄 주의 월요일 */
  weekStart: DateStr
  onChangeWeek(weekStart: DateStr): void
  /** 요일별(기본), 계획표, 체크표 */
  view: BoardView
}

/**
 * 주간 학습 보드. 위에는 주 이동과 이번 주 진행, 가운데는 표(요일별, 계획표, 체크표), 아래에는 과목 추가.
 * 과목 이름을 누르면 과목 설정 화면으로 갑니다.
 */
export default function WeekBoard({ child, weekStart, onChangeWeek, view }: WeekBoardProps) {
  const { subjects } = useSubjects(child.id)
  const { tasksOf } = useTasks()
  const { isDone, toggleCheck } = useChecks()
  const [error, setError] = useState('')
  const todayStr = today()
  const currentWeek = startOfWeek(todayStr)
  const dates = useMemo(() => weekDates(weekStart), [weekStart])
  const allTasks = useMemo(() => subjects.flatMap((subject) => tasksOf(subject.id)), [subjects, tasksOf])
  const total = progressOf(allTasks, dates, isDone)
  const dayTotals = allTasks.length > 0 ? dates.map((date) => progressOf(allTasks, [date], isDone)) : null

  async function toggle(taskId: string, date: DateStr) {
    try {
      setError('')
      await toggleCheck(taskId, date)
    } catch {
      setError('저장하지 못했습니다. 다시 시도하세요.')
    }
  }

  const tableProps = { subjects, tasksOf, dates, todayStr, isDone, onToggle: toggle, dayTotals }

  return (
    <div className={`card board-card is-view-${view}`}>
      <div className="board-toolbar">
        <div className="week-nav">
          <button type="button" className="icon-btn" onClick={() => onChangeWeek(addDays(weekStart, -7))} aria-label="지난주">
            <BackIcon />
          </button>
          <strong>{formatWeekRange(weekStart)}</strong>
          <button type="button" className="icon-btn" onClick={() => onChangeWeek(addDays(weekStart, 7))} aria-label="다음 주">
            <ChevronRightIcon />
          </button>
        </div>
        {weekStart === currentWeek ? (
          <span className="badge week-badge">이번 주</span>
        ) : (
          <button type="button" className="btn btn-secondary btn-small today-btn" onClick={() => onChangeWeek(currentWeek)}>
            이번 주로
          </button>
        )}
      </div>

      {allTasks.length > 0 && (
        <div className="week-summary" aria-label="이번 주 진행">
          <p className="week-summary-text">
            <strong>{total.done}</strong>
            <span className="muted">
              / {total.planned} 완료 · {percent(total)}%
            </span>
          </p>
          <span className="progress" aria-hidden="true">
            <span style={{ width: `${percent(total)}%` }} />
          </span>
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="board-empty">
          <p>아직 과목이 없습니다.</p>
          <p className="muted">과목을 추가하고 그 아래에 학습 내용(예: 문제집 2쪽, 영어 단어 20개)을 넣으면 요일마다 체크할 수 있습니다.</p>
        </div>
      ) : view === 'plan' ? (
        <PlanTable {...tableProps} />
      ) : view === 'days' ? (
        <DayPlanTable {...tableProps} />
      ) : (
        <CheckTable {...tableProps} />
      )}

      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="board-links">
        <Link to={`/study/subjects/new?child=${child.id}`} className="btn btn-secondary add-subject">
          <PlusIcon />
          과목 추가
        </Link>
        {subjects.length > 1 && (
          <Link to="/study/subjects" className="btn btn-secondary">
            과목 순서 바꾸기
          </Link>
        )}
      </div>
      {subjects.length > 0 && (
        <p className="muted board-hint">
          {view !== 'check'
            ? '칸 안의 학습 내용을 누르면 체크됩니다. 과목 이름을 누르면 학습 내용과 계획 요일을 고칠 수 있습니다.'
            : '과목 이름을 누르면 학습 내용과 계획 요일을 고칠 수 있습니다.'}
        </p>
      )}
    </div>
  )
}
