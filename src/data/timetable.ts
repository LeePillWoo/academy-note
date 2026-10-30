import { WEEKDAY_NAMES, WEEKDAYS_FROM_MONDAY, type DateStr, type TimeStr, type Weekday } from '../utils/date'
import { periodAt } from './academyRules'
import { newId } from './id'
import type { Academy, Period, TimeSlot } from './types'

/** 시간표의 블록 하나 (학원의 한 요일 수업) */
export interface TimetableBlock {
  /** `${academyId}|${weekday}` */
  id: string
  academyId: string
  weekday: Weekday
  start: TimeStr
  end: TimeStr
}

/** 끌어 옮길 때 맞추는 단위 (분) */
export const SNAP_MINUTES = 10

export function toMinutes(time: TimeStr): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function toTime(minutes: number): TimeStr {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

/** 그 날짜에 다니고 있는 학원 (수강 시작일 이후, 그만둔 날 전) */
export function activeAcademiesOn(academies: Academy[], date: DateStr): Academy[] {
  return academies.filter((academy) => academy.startedOn <= date && (!academy.endedOn || academy.endedOn >= date))
}

/** 그 날짜 기준 시간표 블록. overrides에 있는 학원은 편집 중인 시간대를 씁니다. */
export function buildBlocks(academies: Academy[], date: DateStr, overrides: Map<string, TimeSlot[]> = new Map()): TimetableBlock[] {
  return activeAcademiesOn(academies, date).flatMap((academy) =>
    (overrides.get(academy.id) ?? periodAt(academy.schedules, date)).map((slot) => ({
      id: `${academy.id}|${slot.weekday}`,
      academyId: academy.id,
      weekday: slot.weekday,
      start: slot.start,
      end: slot.end,
    })),
  )
}

/**
 * 시간표에 보여줄 시각 범위(분). 아침 7시부터 밤 12시(24시)까지 항상 전부 보여줍니다. (사용자 요청)
 * 7시 전에 시작하는 수업이 있으면 그 정시까지 위로 넓힙니다.
 */
export function timeRange(blocks: TimetableBlock[]): { startMin: number; endMin: number } {
  const earliest = Math.min(7 * 60, ...blocks.map((block) => toMinutes(block.start)))
  return { startMin: Math.floor(earliest / 60) * 60, endMin: 24 * 60 }
}

/** 월요일부터 센 요일 위치 (0=월 … 6=일) */
export function dayIndexOf(weekday: Weekday): number {
  return WEEKDAYS_FROM_MONDAY.indexOf(weekday)
}

export function weekdayAt(dayIndex: number): Weekday {
  return WEEKDAYS_FROM_MONDAY[Math.max(0, Math.min(6, dayIndex))]
}

/**
 * 한 시간대를 다른 요일·시각으로 옮깁니다. 길이는 그대로입니다.
 * 같은 학원은 한 요일에 수업이 하나뿐이라서, 옮기려는 요일에 이미 다른 수업이 있으면 옮기지 않습니다.
 */
export function moveSlot(slots: TimeSlot[], from: Weekday, to: Weekday, newStart: TimeStr): { slots: TimeSlot[] } | { error: string } {
  const slot = slots.find((item) => item.weekday === from)
  if (!slot) return { error: '옮길 수업을 찾지 못했습니다.' }
  if (to !== from && slots.some((item) => item.weekday === to)) {
    return { error: `${WEEKDAY_NAMES[to]}요일에 이미 이 학원 수업이 있습니다.` }
  }
  const duration = toMinutes(slot.end) - toMinutes(slot.start)
  const startMin = toMinutes(newStart)
  if (startMin < 0 || startMin + duration > 24 * 60) return { error: '하루를 넘어가는 시각입니다.' }
  const moved: TimeSlot = { weekday: to, start: toTime(startMin), end: toTime(startMin + duration) }
  return { slots: slots.map((item) => (item.weekday === from ? moved : item)) }
}

/** 예: '월 17:00~18:30 → 화 18:00~19:30' */
export function describeMove(before: TimeSlot, after: TimeSlot): string {
  const text = (slot: TimeSlot) => `${WEEKDAY_NAMES[slot.weekday]} ${slot.start}~${slot.end}`
  return `${text(before)} → ${text(after)}`
}

/**
 * 바뀐 시간대를 학원 일정에 반영한 기간 목록을 만듭니다.
 * - applyFrom이 'current'면 asOf 날짜에 적용 중인 기간의 시간대를 그대로 고칩니다. (잘못 넣은 것을 바로잡을 때)
 * - 날짜면 그날부터 새 기간을 추가합니다. 이미 그날 시작하는 기간이 있으면 그 기간을 고치고,
 *   수강 시작일보다 앞이면 첫 기간을 고칩니다. 그 전 달력과 기록은 그대로 남습니다.
 */
export function schedulesWithChange(
  academy: Academy,
  slots: TimeSlot[],
  applyFrom: DateStr | 'current',
  asOf: DateStr,
): Period<TimeSlot[]>[] {
  const periods = academy.schedules
  const replaceAt = (index: number) => periods.map((period, i) => (i === index ? { ...period, value: slots } : period))

  if (applyFrom === 'current') {
    let index = 0
    periods.forEach((period, i) => {
      if (period.startsOn <= asOf) index = i
    })
    return replaceAt(index)
  }
  if (applyFrom <= academy.startedOn) return replaceAt(0)
  const existing = periods.findIndex((period) => period.startsOn === applyFrom)
  if (existing !== -1) return replaceAt(existing)
  return [...periods, { id: newId(), startsOn: applyFrom, value: slots }]
}
