import { useAcademies } from '../data/academies'
import { useChildren } from '../data/children'
import type { LessonView } from '../data/lessonPlan'
import { useSelectedChild } from '../data/SelectedChild'
import LessonStatusBadge from './LessonStatusBadge'

interface LessonRowProps {
  view: LessonView
  onClick(): void
}

/** 수업 한 줄: 학원 색, 이름(전체 보기면 자녀 이름도), 시각, 메모, 상태. 누르면 기록 창을 엽니다. */
export default function LessonRow({ view, onClick }: LessonRowProps) {
  const { academies } = useAcademies()
  const { children } = useChildren()
  const { selectedChildId } = useSelectedChild()
  const academy = academies.find((item) => item.id === view.academyId)
  if (!academy) return null
  const child = !selectedChildId && children.length > 1 ? children.find((item) => item.id === academy.childId) : undefined
  const time = view.start ? `${view.start}~${view.end}` : '시각 없음'

  return (
    <button type="button" className="list-row list-button" onClick={onClick}>
      <span className="dot" style={{ background: academy.color }} />
      <span className="list-text">
        <span className="list-title">
          {academy.name}
          {child && <span className="muted"> · {child.name}</span>}
        </span>
        <span className="list-sub">
          {time}
          {view.record?.memo && ` · ${view.record.memo}`}
        </span>
      </span>
      <LessonStatusBadge view={view} />
    </button>
  )
}
