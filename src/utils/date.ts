/**
 * 날짜는 'YYYY-MM-DD' 글자로 다룹니다. (예: '2026-10-30')
 * - 시간대 때문에 날짜가 하루씩 밀리는 문제가 없습니다.
 * - 글자 그대로 크기 비교가 됩니다. ('2026-10-30' < '2026-11-01')
 */
export type DateStr = string

/** 0=일, 1=월, … 6=토 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const

/** 수업 요일을 고를 때 보여주는 순서 (월요일부터) */
export const WEEKDAYS_FROM_MONDAY: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

/** 평일 (월~금). 새 학습 내용의 기본 계획 요일입니다. */
export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5]

/** 요일 목록을 월요일부터 순서로 정렬합니다. 중복은 없앱니다. */
export function sortWeekdays(days: Weekday[]): Weekday[] {
  return WEEKDAYS_FROM_MONDAY.filter((day) => days.includes(day))
}

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateStr(date: Date): DateStr {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function makeDate(year: number, month: number, day: number): DateStr {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function dateParts(date: DateStr): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

function toJsDate(date: DateStr): Date {
  const { year, month, day } = dateParts(date)
  return new Date(year, month - 1, day)
}

export function today(): DateStr {
  return toDateStr(new Date())
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const { year, month, day } = dateParts(value)
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function addDays(date: DateStr, days: number): DateStr {
  const d = toJsDate(date)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

/** 몇 달 뒤 같은 날. 그 달에 없는 날이면 말일로 맞춥니다. (1월 31일 + 1달 = 2월 28일) */
export function addMonths(date: DateStr, months: number): DateStr {
  const { year, month, day } = dateParts(date)
  const total = year * 12 + (month - 1) + months
  const nextYear = Math.floor(total / 12)
  const nextMonth = (total % 12) + 1
  return makeDate(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)))
}

export function startOfMonth(date: DateStr): DateStr {
  const { year, month } = dateParts(date)
  return makeDate(year, month, 1)
}

export function endOfMonth(date: DateStr): DateStr {
  const { year, month } = dateParts(date)
  return makeDate(year, month, daysInMonth(year, month))
}

/** 그 달의 day일. 그 달에 없는 날이면 말일로 맞춥니다. (2월의 31일 = 2월 28일) */
export function dayOfMonthClamped(year: number, month: number, day: number): DateStr {
  return makeDate(year, month, Math.min(day, daysInMonth(year, month)))
}

export function weekdayOf(date: DateStr): Weekday {
  return toJsDate(date).getDay() as Weekday
}

/** 두 날짜 사이의 날 수 (to - from) */
export function daysBetween(from: DateStr, to: DateStr): number {
  return Math.round((toJsDate(to).getTime() - toJsDate(from).getTime()) / 86_400_000)
}

/** 화면에 보여주는 날짜. 올해면 연도를 뺍니다. 예: '10월 30일 (금)', '2025년 3월 2일 (일)' */
export function formatDate(date: DateStr, options: { withYear?: boolean } = {}): string {
  const { year, month, day } = dateParts(date)
  const showYear = options.withYear ?? year !== dateParts(today()).year
  const text = `${month}월 ${day}일 (${WEEKDAY_NAMES[weekdayOf(date)]})`
  return showYear ? `${year}년 ${text}` : text
}

/** 'HH:MM' 시각 글자. 크기 비교가 글자 그대로 됩니다. */
export type TimeStr = string

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}
