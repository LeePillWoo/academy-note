import { LESSON_STATUS_LABELS, type LessonView } from '../data/lessonPlan'

/** 수업 상태 표시. 기록 없이 출석으로 본 지난 수업은 흐리게 보여줍니다. */
export default function LessonStatusBadge({ view }: { view: Pick<LessonView, 'status' | 'assumed'> }) {
  return (
    <span className={`badge status-${view.status}${view.assumed ? ' is-assumed' : ''}`}>
      {LESSON_STATUS_LABELS[view.status]}
    </span>
  )
}
