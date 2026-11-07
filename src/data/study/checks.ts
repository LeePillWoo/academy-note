import { useMemo } from 'react'
import type { DateStr } from '../../utils/date'
import { startOfWeek } from '../../utils/week'
import { useData } from '../DataProvider'
import { nowIso } from '../id'
import type { Change, Database, StudyWeek } from '../types'

/** 체크 한 칸의 이름. 주 묶음의 done 목록에 들어갑니다. (itemId = 학습 내용, 또는 학습 내용이 없는 과목) */
export function checkKey(itemId: string, date: DateStr): string {
  return `${itemId}:${date}`
}

/** 한 자녀의 한 주 묶음 id */
export function studyWeekId(childId: string, weekStart: DateStr): string {
  return `${childId}:${weekStart}`
}

/**
 * 체크할 줄이 어느 자녀 것인지. id는 학습 내용이거나(과목을 거쳐 찾음),
 * 학습 내용이 없는 과목 자체입니다.
 */
export function childIdOfItem(data: Database, itemId: string): string | undefined {
  const task = data.studyTasks.find((item) => item.id === itemId)
  if (task) return data.subjects.find((subject) => subject.id === task.subjectId)?.childId
  return data.subjects.find((subject) => subject.id === itemId)?.childId
}

/** 주 묶음의 done 목록을 바꾸는 변경. 비면 묶음을 지웁니다. */
function weekChange(week: StudyWeek, done: string[], now: string): Change {
  return done.length === 0
    ? { type: 'remove', collection: 'studyWeeks', id: week.id }
    : { type: 'put', collection: 'studyWeeks', item: { ...week, done, updatedAt: now } }
}

/** 칸 하나를 체크하거나 취소하는 변경. 그 주 묶음만 고쳐 씁니다. */
export function checkToggleChanges(data: Database, itemId: string, date: DateStr, now = nowIso()): Change[] {
  const childId = childIdOfItem(data, itemId)
  if (!childId) return []
  const weekStart = startOfWeek(date)
  const id = studyWeekId(childId, weekStart)
  const key = checkKey(itemId, date)
  const week = data.studyWeeks.find((item) => item.id === id)
  if (!week) {
    return [{ type: 'put', collection: 'studyWeeks', item: { id, childId, weekStart, done: [key], createdAt: now, updatedAt: now } }]
  }
  const done = week.done.includes(key) ? week.done.filter((item) => item !== key) : [...week.done, key]
  return [weekChange(week, done, now)]
}

/**
 * 체크를 지우는 변경. 여러 줄(학습 내용·과목)을 **한 번에** 넘겨야 합니다.
 * 나눠서 부르면 같은 주 묶음을 두 번 덮어써 한쪽이 사라집니다.
 */
export function checksRemovalChanges(data: Database, itemIds: string[], now = nowIso()): Change[] {
  if (itemIds.length === 0) return []
  const prefixes = itemIds.map((id) => `${id}:`)
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

  function isDone(itemId: string, date: DateStr): boolean {
    return doneKeys.has(checkKey(itemId, date))
  }

  /** 바로 앞 저장이 끝난 최신 데이터 기준으로 바꿉니다. (빠르게 연달아 눌러도 앞의 체크가 사라지지 않게) */
  function toggleCheck(itemId: string, date: DateStr): Promise<void> {
    return update((latest) => checkToggleChanges(latest, itemId, date))
  }

  return { isDone, toggleCheck }
}
