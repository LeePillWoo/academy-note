import { useState } from 'react'
import { Link } from 'react-router'
import BoardPrintSheet from '../../components/study/BoardPrintSheet'
import type { BoardView } from '../../components/study/boardTypes'
import WeekBoard from '../../components/study/WeekBoard'
import { ChevronRightIcon, PlusIcon, PrinterIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import Segmented from '../../components/Segmented'
import { useChildren } from '../../data/children'
import { useData } from '../../data/DataProvider'
import { useSelectedChild } from '../../data/SelectedChild'
import { useChecks } from '../../data/study/checks'
import { useStudyChild } from '../../data/study/studyChild'
import { byOrder } from '../../data/study/subjects'
import { studyWeekSummary } from '../../data/study/summary'
import { useTasks } from '../../data/study/tasks'
import { percent } from '../../data/study/weekStats'
import { today } from '../../utils/date'
import { formatWeekRange, thisWeekStart } from '../../utils/week'
import { printPage } from '../../native/print'

const VIEW_KEY = 'academy-note:study-view'

// 요일별(왼쪽 요일, 위 과목)이 먼저이자 기본. 계획표는 왼쪽 과목, 위 요일
const VIEW_OPTIONS: { value: BoardView; label: string }[] = [
  { value: 'days', label: '요일별' },
  { value: 'plan', label: '계획표' },
  { value: 'check', label: '체크표' },
]

/** 마지막으로 고른 보기 방식. 앱을 다시 열어도, 다른 화면에 다녀와도 그대로입니다. 기본은 요일별 */
function loadView(): BoardView {
  const stored = localStorage.getItem(VIEW_KEY)
  return VIEW_OPTIONS.some((option) => option.value === stored) ? (stored as BoardView) : 'days'
}

/** 학습: 고른 자녀의 주간 학습 보드. 전체를 고르면 자녀마다 이번 주 진행 카드 */
export default function StudyPage() {
  const { children } = useChildren()
  const child = useStudyChild()
  const [weekStart, setWeekStart] = useState(thisWeekStart)
  const [view, setView] = useState<BoardView>(loadView)

  function changeView(next: BoardView) {
    setView(next)
    localStorage.setItem(VIEW_KEY, next)
  }

  if (children.length === 0) {
    return (
      <section className="narrow">
        <PageHeader title="학습" subtitle="자녀의 학습 계획을 요일별로 체크하세요." />
        <div className="card">
          <p>먼저 자녀를 등록하세요. 자녀마다 과목과 학습 내용을 따로 두고 주 단위로 체크할 수 있습니다.</p>
          <Link to="/settings/children/new" className="btn btn-primary">
            <PlusIcon />
            자녀 등록하기
          </Link>
        </div>
      </section>
    )
  }

  if (!child) return <StudyOverview />

  const viewLabel = view === 'check' ? '체크표' : '계획표'

  return (
    <section>
      <PageHeader
        title="학습"
        subtitle={`${child.name}의 학습 계획을 요일별로 체크하세요.`}
        actions={
          <div className="board-actions">
            <Segmented<BoardView> label="보기 방식" name="board-view" value={view} options={VIEW_OPTIONS} onChange={changeView} />
            <button type="button" className="btn btn-secondary btn-small print-btn"
              onClick={() => printPage(`학습 ${viewLabel} ${child.name} ${formatWeekRange(weekStart)}`, { landscape: view !== 'days' })}>
              <PrinterIcon />
              <span className="btn-label">인쇄</span>
            </button>
          </div>
        }
      />
      <WeekBoard key={child.id} child={child} weekStart={weekStart} onChangeWeek={setWeekStart} view={view} />
      <BoardPrintSheet child={child} weekStart={weekStart} view={view} />
    </section>
  )
}

/** 전체 보기: 자녀마다 이번 주 진행과 오늘 할 것. 누르면 그 자녀의 보드로 */
function StudyOverview() {
  const { children } = useChildren()
  const { selectChild } = useSelectedChild()
  const { data } = useData()
  const { tasksOf } = useTasks()
  const { isDone } = useChecks()
  const todayStr = today()

  return (
    <section className="narrow">
      <PageHeader title="학습" subtitle="자녀를 누르면 그 자녀의 주간 학습 보드가 열립니다." />
      <div className="study-overview">
        {children.map((child) => {
          const subjects = data.subjects.filter((subject) => subject.childId === child.id).sort(byOrder)
          const summary = studyWeekSummary(subjects, tasksOf, todayStr, isDone)
          return (
            <button key={child.id} type="button" className="card study-child-card" onClick={() => selectChild(child.id)}>
              <span className="study-child-head">
                <span className="dot" style={{ background: child.color }} />
                {child.name}
                <ChevronRightIcon />
              </span>
              {summary.taskCount === 0 ? (
                <span className="muted">아직 학습 계획이 없습니다. 눌러서 과목을 추가하세요.</span>
              ) : (
                <>
                  <span className="study-child-stats">
                    <span>
                      이번 주 <strong>{summary.week.done}</strong> / {summary.week.planned} 완료 · {percent(summary.week)}%
                    </span>
                    <span>
                      오늘{' '}
                      {summary.today.total === 0 ? '계획 없음' : (
                        <>
                          <strong>{summary.today.done}</strong> / {summary.today.total}
                        </>
                      )}
                    </span>
                  </span>
                  <span className="progress" aria-hidden="true">
                    <span style={{ width: `${percent(summary.week)}%` }} />
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
