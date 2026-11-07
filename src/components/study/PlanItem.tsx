import type { StudyItem } from '../../data/study/items'
import type { CellState } from '../../data/study/weekStats'
import { formatDate, type DateStr } from '../../utils/date'

interface PlanItemProps {
  item: StudyItem
  date: DateStr
  state: CellState
  isToday: boolean
  onToggle(): void
}

/**
 * 계획표(과목 왼쪽, 요일 왼쪽 모두) 칸 안의 한 줄: 작은 체크 네모와 이름.
 * 학습 내용이거나, 학습 내용이 없는 과목 자체입니다.
 * 누르면 체크하거나 취소합니다. 색은 칸에 넣어 둔 과목 색(--chip-solid 등)을 씁니다.
 */
export default function PlanItem({ item, date, state, isToday, onToggle }: PlanItemProps) {
  const className = ['plan-item', state.planned && 'is-planned', state.done && 'is-done', state.missed && 'is-missed']
    .filter(Boolean)
    .join(' ')
  const status = state.done ? '완료' : state.planned ? '미완료' : '계획 없음'
  const label = `${item.name} ${formatDate(date)}${isToday ? ' 오늘' : ''} ${status}`

  return (
    <button type="button" className={className} aria-pressed={state.done} aria-label={label} onClick={onToggle}>
      <span className="check-box">
        {state.done && (
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        )}
      </span>
      <span className="plan-item-name">{item.name}</span>
    </button>
  )
}
