import { weekdayOf, type DateStr } from '../../utils/date'
import type { StudyItem } from './items'

/** 보드 칸 하나의 상태 */
export interface CellState {
  /** 이 요일에 하기로 계획했는지 */
  planned: boolean
  /** 체크했는지 */
  done: boolean
  /** 계획한 날이 지났는데 체크하지 않았는지 (오늘은 아직 아님) */
  missed: boolean
}

export function cellState(item: StudyItem, date: DateStr, done: boolean, todayStr: DateStr): CellState {
  const planned = item.weekdays.includes(weekdayOf(date))
  return { planned, done, missed: planned && !done && date < todayStr }
}

export interface Progress {
  /** 체크한 칸 수. 계획하지 않은 날에 한 것도 셉니다. */
  done: number
  /** 계획한 칸 수 */
  planned: number
}

/** 체크할 줄들의 날짜 범위 안 완료·계획 칸 수 */
export function progressOf(items: StudyItem[], dates: DateStr[], isDone: (itemId: string, date: DateStr) => boolean): Progress {
  let done = 0
  let planned = 0
  for (const item of items) {
    for (const date of dates) {
      if (item.weekdays.includes(weekdayOf(date))) planned += 1
      if (isDone(item.id, date)) done += 1
    }
  }
  return { done, planned }
}

/** 계획표 칸에 보일 줄: 그날 계획한 것과, 계획에 없어도 그날 체크한 것 (순서는 그대로) */
export function dayItems(items: StudyItem[], date: DateStr, isDone: (itemId: string, date: DateStr) => boolean): StudyItem[] {
  const weekday = weekdayOf(date)
  return items.filter((item) => item.weekdays.includes(weekday) || isDone(item.id, date))
}

/** 완료 비율(0~100). 계획보다 많이 했어도 100을 넘지 않습니다. */
export function percent(progress: Progress): number {
  if (progress.planned === 0) return progress.done > 0 ? 100 : 0
  return Math.min(100, Math.round((progress.done / progress.planned) * 100))
}
