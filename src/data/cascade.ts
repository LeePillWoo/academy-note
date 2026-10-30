import type { Change, Database } from './types'

/**
 * 학원을 지울 때 함께 지울 것들. 학원과 그 학원의 수업 기록.
 * 보강, 납부가 생기면 여기에 추가합니다.
 */
export function academyRemovalChanges(data: Database, academyId: string): Change[] {
  return [
    ...data.lessons
      .filter((lesson) => lesson.academyId === academyId)
      .map((lesson): Change => ({ type: 'remove', collection: 'lessons', id: lesson.id })),
    { type: 'remove', collection: 'academies', id: academyId },
  ]
}

/** 자녀를 지울 때 함께 지울 것들. 자녀와 그 자녀의 학원(과 학원에 딸린 기록). */
export function childRemovalChanges(data: Database, childId: string): Change[] {
  return [
    ...data.academies
      .filter((academy) => academy.childId === childId)
      .flatMap((academy) => academyRemovalChanges(data, academy.id)),
    { type: 'remove', collection: 'children', id: childId },
  ]
}
