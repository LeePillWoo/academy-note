import { addDays, weekdayOf, type DateStr, type TimeStr } from '../utils/date'
import { periodAt } from './academyRules'
import type { Academy, Lesson, LessonStatus } from './types'

/** 학원 일정에서 계산한 수업 하나 */
export interface PlannedLesson {
  academyId: string
  date: DateStr
  start: TimeStr
  end: TimeStr
}

/** from~to 사이의 수업일. 수강 시작일 전과 그만둔 날 뒤는 빼고, 날짜마다 그때의 일정을 씁니다. */
export function plannedLessons(academy: Academy, from: DateStr, to: DateStr): PlannedLesson[] {
  const result: PlannedLesson[] = []
  const first = from > academy.startedOn ? from : academy.startedOn
  const last = academy.endedOn && academy.endedOn < to ? academy.endedOn : to
  for (let date = first; date <= last; date = addDays(date, 1)) {
    const weekday = weekdayOf(date)
    for (const slot of periodAt(academy.schedules, date)) {
      if (slot.weekday === weekday) result.push({ academyId: academy.id, date, start: slot.start, end: slot.end })
    }
  }
  return result
}

/** 화면에 보여줄 수업. 일정에 있는 수업과 기록을 합친 것 */
export interface LessonView {
  key: string
  academyId: string
  date: DateStr
  start?: TimeStr
  end?: TimeStr
  /** 학원 일정에 있는 수업인지 (보강 출석 같은 추가 수업은 false) */
  planned: boolean
  record?: Lesson
  /** 기록이 없으면 지난 수업은 출석, 오늘과 앞으로는 예정(planned) */
  status: LessonStatus | 'planned'
  /** 기록 없이 출석으로 본 지난 수업 */
  assumed: boolean
}

/** 일정에 있는 수업은 학원+날짜로 찾고, 보강 출석은 기록마다 따로 봅니다. */
export function lessonKey(academyId: string, date: DateStr, record?: Lesson): string {
  return record?.status === 'makeup' ? `${academyId}|${date}|makeup|${record.id}` : `${academyId}|${date}`
}

/** from~to 사이 수업 목록 (날짜, 시각, 학원 순서) */
export function buildLessonViews(
  academies: Academy[],
  records: Lesson[],
  from: DateStr,
  to: DateStr,
  todayStr: DateStr,
): LessonView[] {
  const views = new Map<string, Omit<LessonView, 'status' | 'assumed'>>()
  for (const academy of academies) {
    for (const lesson of plannedLessons(academy, from, to)) {
      const key = lessonKey(lesson.academyId, lesson.date)
      views.set(key, { key, ...lesson, planned: true })
    }
  }

  // 일정이 바뀌어 더는 수업일이 아닌 날의 기록도 숨기지 않고 보여줍니다.
  const academyIds = new Set(academies.map((academy) => academy.id))
  for (const record of records) {
    if (!academyIds.has(record.academyId) || record.date < from || record.date > to) continue
    const key = lessonKey(record.academyId, record.date, record)
    const existing = views.get(key)
    views.set(key, {
      key,
      academyId: record.academyId,
      date: record.date,
      start: existing?.start ?? record.start,
      end: existing?.end ?? record.end,
      planned: existing?.planned ?? false,
      record,
    })
  }

  const academyOrder = new Map(academies.map((academy, index) => [academy.id, index]))
  return [...views.values()]
    .map((view) => {
      const assumed = !view.record && view.date < todayStr
      return { ...view, status: view.record?.status ?? (assumed ? 'attended' : 'planned'), assumed } as LessonView
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        // 시각이 없는 기록은 그날의 맨 뒤로
        (a.start ?? '99:99').localeCompare(b.start ?? '99:99') ||
        (academyOrder.get(a.academyId) ?? 0) - (academyOrder.get(b.academyId) ?? 0),
    )
}

export const LESSON_STATUS_LABELS: Record<LessonView['status'], string> = {
  attended: '출석',
  absent: '결석',
  cancelled: '휴강',
  makeup: '보강 출석',
  planned: '예정',
}
