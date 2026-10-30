import { useData } from './DataProvider'
import { newId, nowIso } from './id'
import type { LessonView } from './lessonPlan'
import type { Lesson, LessonStatus } from './types'

/** 수업 기록과 기록을 바꾸는 기능 */
export function useLessons() {
  const { data, apply } = useData()

  /** 수업에 출석/결석/휴강을 기록합니다. 이미 기록이 있으면 고칩니다. */
  async function recordLesson(view: LessonView, status: LessonStatus, memo: string) {
    const now = nowIso()
    const item: Lesson = view.record
      ? { ...view.record, status, memo, updatedAt: now }
      : {
          id: newId(),
          academyId: view.academyId,
          date: view.date,
          start: view.start,
          end: view.end,
          status,
          memo,
          createdAt: now,
          updatedAt: now,
        }
    await apply([{ type: 'put', collection: 'lessons', item }])
  }

  /** 기록을 지워 처음 상태(지난 수업은 출석, 앞으로는 예정)로 되돌립니다. */
  async function clearLesson(id: string) {
    await apply([{ type: 'remove', collection: 'lessons', id }])
  }

  return { lessons: data.lessons, recordLesson, clearLesson }
}
