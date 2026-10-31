import type { DateStr } from '../../utils/date'
import { weekDates, startOfWeek } from '../../utils/week'
import type { StudyTask, Subject } from '../types'
import { dayItems, progressOf, type Progress } from './weekStats'

type IsDone = (taskId: string, date: DateStr) => boolean

export interface TodayStudyItem {
  task: StudyTask
  subject: Subject
  done: boolean
}

/** 그날 할 학습 내용(계획한 것과 계획에 없어도 체크한 것). 과목 순서, 과목 안의 순서대로 */
export function studyItemsOn(subjects: Subject[], tasksOf: (subjectId: string) => StudyTask[], date: DateStr, isDone: IsDone): TodayStudyItem[] {
  return subjects.flatMap((subject) =>
    dayItems(tasksOf(subject.id), date, isDone).map((task) => ({ task, subject, done: isDone(task.id, date) })),
  )
}

export interface StudyWeekSummary {
  /** 이번 주(그 날짜가 든 주) 완료/계획 칸 수 */
  week: Progress
  /** 그날 할 것 중 한 것/전체 */
  today: { done: number; total: number }
  taskCount: number
}

/** 한 자녀의 이번 주 진행과 오늘 할 것 (학습 화면 전체 보기) */
export function studyWeekSummary(subjects: Subject[], tasksOf: (subjectId: string) => StudyTask[], date: DateStr, isDone: IsDone): StudyWeekSummary {
  const tasks = subjects.flatMap((subject) => tasksOf(subject.id))
  const items = studyItemsOn(subjects, tasksOf, date, isDone)
  return {
    week: progressOf(tasks, weekDates(startOfWeek(date)), isDone),
    today: { done: items.filter((item) => item.done).length, total: items.length },
    taskCount: tasks.length,
  }
}
