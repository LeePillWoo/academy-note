import { addDays, dateParts, daysBetween, today, weekdayOf, type DateStr } from './date'

/** 그 날짜가 든 주의 월요일. 주는 월요일에 시작해 일요일에 끝납니다. */
export function startOfWeek(date: DateStr): DateStr {
  // 0=일 … 6=토 를 월=0 … 일=6 으로 바꿔 월요일까지 며칠 앞인지 셉니다.
  const offset = (weekdayOf(date) + 6) % 7
  return addDays(date, -offset)
}

/** 월요일부터 일요일까지 7일 */
export function weekDates(weekStart: DateStr): DateStr[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function thisWeekStart(): DateStr {
  return startOfWeek(today())
}

/**
 * 주 범위 글자. 예: '10월 26일 ~ 11월 1일', 같은 달이면 '11월 2일 ~ 8일'.
 * 올해가 아닌 해는 연도를 붙입니다. 예: '2025년 12월 29일 ~ 2026년 1월 4일'
 */
export function formatWeekRange(weekStart: DateStr, base: DateStr = today()): string {
  const start = dateParts(weekStart)
  const end = dateParts(addDays(weekStart, 6))
  const thisYear = dateParts(base).year
  const startText = `${start.year !== thisYear ? `${start.year}년 ` : ''}${start.month}월 ${start.day}일`
  let endText: string
  if (end.year !== start.year) endText = `${end.year}년 ${end.month}월 ${end.day}일`
  else if (end.month !== start.month) endText = `${end.month}월 ${end.day}일`
  else endText = `${end.day}일`
  return `${startText} ~ ${endText}`
}

/** 이번 주와의 거리. 0이면 이번 주, -1이면 지난주, 1이면 다음 주 */
export function weekOffset(weekStart: DateStr, base: DateStr = today()): number {
  return Math.round(daysBetween(startOfWeek(base), weekStart) / 7)
}
