import { useMemo } from 'react'
import type { DateStr } from '../../utils/date'
import { startOfWeek } from '../../utils/week'
import { useData } from '../DataProvider'
import { nowIso } from '../id'
import type { Change, Database, StudyWeek } from '../types'

/** 체크 한 칸의 이름. 주 묶음의 done 목록에 들어갑니다. */
export function checkKey(taskId: string, date: DateStr): string {
  return `${taskId}:${date}`
}

/** 한 자녀의 한 주 묶음 id */
export function studyWeekId(childId: string, weekStart: DateStr): string {
  return `${childId}:${weekStart}`
}

/** 학습 내용이 어느 자녀 것인지 (과목을 거쳐 찾음) */
export function childIdOfTask(data: Database, taskId: string): string | undefined {
  const task = data.studyTasks.find((item) => item.id === taskId)
  return task && data.subjects.find((subject) => subject.id === task.subjectId)?.childId
}

/** 주 묶음의 done 목록을 바꾸는 변경. 비면 묶음을 지웁니다. */
function weekChange(week: StudyWeek, done: string[], now: string): Change {
  return done.length === 0
    ? { type: 'remove', collection: 'studyWeeks', id: week.id }
    : { type: 'put', collection: 'studyWeeks', item: { ...week, done, updatedAt: now } }
}

/** 칸 하나를 체크하거나 취소하는 변경. 그 주 묶음만 고쳐 씁니다. */
export function checkToggleChanges(data: Database, taskId: string, date: DateStr, now = nowIso()): Change[] {
  const childId = childIdOfTask(data, taskId)
  if (!childId) return []
  const weekStart = startOfWeek(date)
  const id = studyWeekId(childId, weekStart)
  const key = checkKey(taskId, date)
  const week = data.studyWeeks.find((item) => item.id === id)
  if (!week) {
    return [{ type: 'put', collection: 'studyWeeks', item: { id, childId, weekStart, done: [key], createdAt: now, updatedAt: now } }]
  }
  const done = week.done.includes(key) ? week.done.filter((item) => item !== key) : [...week.done, key]
  return [weekChange(week, done, now)]
}

/** 학습 내용들을 지울 때 주 묶음에서 그 체크들을 빼는 변경 (여러 내용을 한 번에 처리해야 같은 주 묶음을 두 번 덮어쓰지 않음) */
export function checksRemovalChanges(data: Database, taskIds: string[], now = nowIso()): Change[] {
  if (taskIds.length === 0) return []
  const prefixes = taskIds.map((id) => `${id}:`)
  const changes: Change[] = []
  for (const week of data.studyWeeks) {
    const done = week.done.filter((key) => !prefixes.some((prefix) => key.startsWith(prefix)))
    if (done.length !== week.done.length) changes.push(weekChange(week, done, now))
  }
  return changes
}

/** 체크 기록을 읽고, 칸을 누르면 켜고 끄는 기능 */
export function useChecks() {
  const { data, update } = useData()
  const doneKeys = useMemo(() => new Set(data.studyWeeks.flatMap((week) => week.done)), [data.studyWeeks])

  function isDone(taskId: string, date: DateStr): boolean {
    return doneKeys.has(checkKey(taskId, date))
  }

  /** 바로 앞 저장이 끝난 최신 데이터 기준으로 바꿉니다. (빠르게 연달아 눌러도 앞의 체크가 사라지지 않게) */
  function toggleCheck(taskId: string, date: DateStr): Promise<void> {
    return update((latest) => checkToggleChanges(latest, taskId, date))
  }

  return { isDone, toggleCheck }
}
