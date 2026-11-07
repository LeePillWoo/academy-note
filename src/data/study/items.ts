import { WEEKDAYS, WEEKDAY_NAMES, sortWeekdays, type Weekday } from '../../utils/date'
import type { StudyTask, Subject } from '../types'

/**
 * 보드에서 체크하는 한 줄.
 * - 학습 내용이 있는 과목: 학습 내용 하나하나가 한 줄
 * - 학습 내용이 없는 과목: **과목 자체**가 한 줄 (id는 과목 id)
 * 체크 기록은 둘 다 `${id}:${날짜}`로 똑같이 저장합니다.
 */
export interface StudyItem {
  id: string
  name: string
  weekdays: Weekday[]
}

/** 과목 자체의 계획 요일. 예전 기록처럼 값이 없으면 평일(월~금) */
export function subjectWeekdays(subject: Subject): Weekday[] {
  return subject.weekdays ?? WEEKDAYS
}

/** 학습 내용이 없어서 과목 자체를 체크하는지 */
export function isSubjectOnly(tasks: StudyTask[]): boolean {
  return tasks.length === 0
}

/** 이 과목에서 체크할 줄들. 학습 내용이 있으면 그 목록, 없으면 과목 한 줄 */
export function itemsOfSubject(subject: Subject, tasks: StudyTask[]): StudyItem[] {
  if (tasks.length > 0) return tasks
  return [{ id: subject.id, name: subject.name, weekdays: subjectWeekdays(subject) }]
}

/** 여러 과목의 체크할 줄 전부 (과목 순서대로) */
export function itemsOfSubjects(subjects: Subject[], tasksOf: (subjectId: string) => StudyTask[]): StudyItem[] {
  return subjects.flatMap((subject) => itemsOfSubject(subject, tasksOf(subject.id)))
}

/** 요일 목록 글자. 예: '월·수·금', 고른 요일이 없으면 '요일 없음' */
export function weekdayLabel(weekdays: Weekday[]): string {
  if (weekdays.length === 0) return '요일 없음'
  return sortWeekdays(weekdays)
    .map((weekday) => WEEKDAY_NAMES[weekday])
    .join('·')
}
