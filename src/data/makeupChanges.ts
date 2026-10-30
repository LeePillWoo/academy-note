import { newId } from './id'
import { makeupDeadline, qualifiesForMakeup } from './makeupRules'
import type { Change, Database, Lesson, Makeup } from './types'

/** 보강을 지울 때: 보강과, 완료했으면 그 보강 출석 기록까지 */
export function makeupRemovalChanges(makeup: Makeup): Change[] {
  return [
    { type: 'remove', collection: 'makeups', id: makeup.id },
    ...(makeup.doneLessonId ? [{ type: 'remove', collection: 'lessons', id: makeup.doneLessonId } as Change] : []),
  ]
}

/**
 * 수업 기록이 바뀐 뒤 보강을 맞춥니다.
 * - 보강 대상(규칙에 맞는 결석/휴강)이 되면 보강을 만듭니다.
 * - 결석 ↔ 휴강으로 바뀌면 이유만 고칩니다.
 * - 보강 대상이 아니게 되거나 기록을 지우면(lesson = null) 연결된 보강을 지웁니다.
 */
export function makeupSyncChanges(data: Database, lessonId: string, lesson: Lesson | null, now: string): Change[] {
  const existing = data.makeups.find((makeup) => makeup.lessonId === lessonId)
  const academy = data.academies.find((item) => item.id === (lesson?.academyId ?? existing?.academyId))
  const status = lesson?.status
  const qualifies = !!(lesson && academy && status && qualifiesForMakeup(academy.makeupRule, status))

  if (!qualifies || !lesson || !academy || (status !== 'absent' && status !== 'cancelled')) {
    return existing ? makeupRemovalChanges(existing) : []
  }
  if (existing) {
    return existing.reason === status ? [] : [{ type: 'put', collection: 'makeups', item: { ...existing, reason: status, updatedAt: now } }]
  }
  const item: Makeup = {
    id: newId(),
    academyId: lesson.academyId,
    lessonId: lesson.id,
    missedOn: lesson.date,
    reason: status,
    deadline: makeupDeadline(academy.makeupRule, lesson.date),
    status: 'open',
    memo: '',
    createdAt: now,
    updatedAt: now,
  }
  return [{ type: 'put', collection: 'makeups', item }]
}

/** 예정 날짜·시각과 완료 기록을 뺀 보강. 예정이나 완료를 취소할 때 씁니다. */
export function withoutSchedule(makeup: Makeup): Makeup {
  const { scheduledOn: _scheduledOn, start: _start, end: _end, doneLessonId: _doneLessonId, ...rest } = makeup
  return rest
}
