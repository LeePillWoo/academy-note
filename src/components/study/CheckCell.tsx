import type { CellState } from '../../data/study/weekStats'
import { formatDate, type DateStr } from '../../utils/date'

interface CheckCellProps {
  taskName: string
  date: DateStr
  state: CellState
  isToday: boolean
  onToggle(): void
}

/**
 * 보드의 칸 하나. 누르면 그날 그 학습 내용을 했다고 체크하거나 취소합니다.
 * - 계획한 요일: 과목 색 테두리의 빈 네모. 체크하면 과목 색으로 채워집니다.
 * - 계획하지 않은 요일: 옅은 점만 보이지만 눌러서 체크할 수 있습니다.
 * - 계획했는데 지난 날: 옅은 분홍 (놓친 날)
 */
export default function CheckCell({ taskName, date, state, isToday, onToggle }: CheckCellProps) {
  const className = ['check-cell', state.planned && 'is-planned', state.done && 'is-done', state.missed && 'is-missed']
    .filter(Boolean)
    .join(' ')
  const status = state.done ? '완료' : state.planned ? '미완료' : '계획 없음'
  const label = `${taskName} ${formatDate(date)}${isToday ? ' 오늘' : ''} ${status}`

  return (
    <button type="button" className={className} aria-pressed={state.done} aria-label={label} onClick={onToggle}>
      <span className="check-box">
        {state.done && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        )}
      </span>
    </button>
  )
}
