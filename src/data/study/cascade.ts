import { nowIso } from '../id'
import type { Change, Database } from '../types'
import { checksRemovalChanges } from './checks'

/** 학습 내용을 지울 때 함께 지울 것들: 그 내용의 체크 (주 묶음에서 뺌) */
export function tasksRemovalChanges(data: Database, taskIds: string[], now = nowIso()): Change[] {
  return [
    ...checksRemovalChanges(data, taskIds, now),
    ...taskIds.map((id): Change => ({ type: 'remove', collection: 'studyTasks', id })),
  ]
}

/** 과목을 지울 때 함께 지울 것들: 과목의 학습 내용과 그 체크 */
export function subjectRemovalChanges(data: Database, subjectId: string, now = nowIso()): Change[] {
  const taskIds = data.studyTasks.filter((task) => task.subjectId === subjectId).map((task) => task.id)
  return [...tasksRemovalChanges(data, taskIds, now), { type: 'remove', collection: 'subjects', id: subjectId }]
}

/** 자녀를 지울 때 함께 지울 학습 기록: 과목, 학습 내용, 주 묶음 (자녀 자체는 빼고) */
export function childStudyRemovalChanges(data: Database, childId: string): Change[] {
  const subjectIds = new Set(data.subjects.filter((subject) => subject.childId === childId).map((subject) => subject.id))
  return [
    ...data.studyWeeks
      .filter((week) => week.childId === childId)
      .map((week): Change => ({ type: 'remove', collection: 'studyWeeks', id: week.id })),
    ...data.studyTasks
      .filter((task) => subjectIds.has(task.subjectId))
      .map((task): Change => ({ type: 'remove', collection: 'studyTasks', id: task.id })),
    ...[...subjectIds].map((id): Change => ({ type: 'remove', collection: 'subjects', id })),
  ]
}
