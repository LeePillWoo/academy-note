import { useAcademies } from '../data/academies'
import { useChildren } from '../data/children'
import { MAKEUP_STATE_LABELS, describeDeadline, makeupState } from '../data/makeupRules'
import { useSelectedChild } from '../data/SelectedChild'
import type { Makeup } from '../data/types'
import { formatDate, today } from '../utils/date'
import ChildTag from './ChildTag'

export const REASON_LABELS: Record<Makeup['reason'], string> = { absent: '결석', cancelled: '휴강' }

/** 보강 한 줄: 학원, 언제 빠진 수업인지, 기한 또는 예정일, 상태. 누르면 보강 창을 엽니다. */
export default function MakeupRow({ makeup, onClick }: { makeup: Makeup; onClick(): void }) {
  const { academies } = useAcademies()
  const { children } = useChildren()
  const { selectedChildId } = useSelectedChild()
  const academy = academies.find((item) => item.id === makeup.academyId)
  if (!academy) return null
  const child = !selectedChildId && children.length > 1 ? children.find((item) => item.id === academy.childId) : undefined
  const todayStr = today()
  const state = makeupState(makeup, todayStr)

  let detail: string
  if (state === 'scheduled' || state === 'done') {
    const when = `${formatDate(makeup.scheduledOn!)} ${makeup.start ?? ''}`.trim()
    detail = state === 'done' ? `${when} 다녀옴` : `${when} 예정${makeup.scheduledOn! < todayStr ? ' · 지남' : ''}`
  } else if (state === 'skipped') {
    detail = makeup.memo || '보강하지 않기로 함'
  } else {
    detail = describeDeadline(makeup.deadline, todayStr)
  }

  return (
    <button type="button" className="list-row list-button" onClick={onClick}>
      <span className="dot" style={{ background: academy.color }} />
      <span className="list-text">
        <span className="list-title">
          {child && <ChildTag child={child} />}
          {academy.name}
        </span>
        <span className="list-sub">
          {formatDate(makeup.missedOn)} {REASON_LABELS[makeup.reason]}분 · {detail}
        </span>
      </span>
      <span className={`badge makeup-${state}`}>{MAKEUP_STATE_LABELS[state]}</span>
    </button>
  )
}
