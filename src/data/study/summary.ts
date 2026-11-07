import type { DateStr } from '../../utils/date'
import { weekDates, startOfWeek } from '../../utils/week'
import type { StudyTask, Subject } from '../types'
import { itemsOfSubject, itemsOfSubjects, type StudyItem } from './items'
import { dayItems, progressOf, type Progress } from './weekStats'

type IsDone = (itemId: string, date: DateStr) => boolean

export interface TodayStudyItem {
  item: StudyItem
  subject: Subject
  done: boolean
}

/** 그날 할 것(계획한 것과 계획에 없어도 체크한 것). 과목 순서, 과목 안의 순서대로 */
export function studyItemsOn(
  subjects: Subject[],
  tasksOf: (subjectId: string) => StudyTask[],
  date: DateStr,
  isDone: IsDone,
): TodayStudyItem[] {
  return subjects.flatMap((subject) =>
    dayItems(itemsOfSubject(subject, tasksOf(subject.id)), date, isDone).map((item) => ({
      item,
      subject,
      done: isDone(item.id, date),
    })),
  )
}

export interface StudyWeekSummary {
  /** 이번 주(그 날짜가 든 주) 완료/계획 칸 수 */
  week: Progress
  /** 그날 할 것 중 한 것/전체 */
  today: { done: number; total: number }
  /** 체크할 줄 수 (학습 내용, 또는 학습 내용 없는 과목) */
  taskCount: number
}

/** 한 자녀의 이번 주 진행과 오늘 할 것 (학습 화면 전체 보기) */
export function studyWeekSummary(
  subjects: Subject[],
  tasksOf: (subjectId: string) => StudyTask[],
  date: DateStr,
  isDone: IsDone,
): StudyWeekSummary {
  const items = itemsOfSubjects(subjects, tasksOf)
  const today = studyItemsOn(subjects, tasksOf, date, isDone)
  return {
    week: progressOf(items, weekDates(startOfWeek(date)), isDone),
    today: { done: today.filter((entry) => entry.done).length, total: today.length },
    taskCount: items.length,
  }
}
