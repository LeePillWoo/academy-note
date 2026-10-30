import { WEEKDAY_NAMES, WEEKDAYS_FROM_MONDAY, type DateStr } from '../utils/date'
import { formatWon } from '../utils/money'
import type { AbsenceCounting, FeePlan, MakeupRule, MakeupWindow, Period, TimeSlot } from './types'

/** date에 적용되는 기간 설정. date가 첫 기간보다 앞이면 첫 기간을 씁니다. */
export function periodAt<T>(periods: Period<T>[], date: DateStr): T {
  let current = periods[0]
  for (const period of periods) {
    if (period.startsOn <= date) current = period
  }
  return current.value
}

/** 기간을 시작일 순서로 정렬하고, 첫 기간의 시작일을 수강 시작일에 맞춥니다. */
export function normalizePeriods<T>(periods: Period<T>[], startedOn: DateStr): Period<T>[] {
  const sorted = [...periods].sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  return sorted.map((period, index) => (index === 0 ? { ...period, startsOn: startedOn } : period))
}

/** 요일 순서(월~일)로 정렬 */
export function sortSlots(slots: TimeSlot[]): TimeSlot[] {
  return [...slots].sort(
    (a, b) => WEEKDAYS_FROM_MONDAY.indexOf(a.weekday) - WEEKDAYS_FROM_MONDAY.indexOf(b.weekday) || a.start.localeCompare(b.start),
  )
}

/** 예: '월·수·금 17:00~18:30', 시간이 다르면 '월 17:00~18:30, 토 10:00~12:00' */
export function describeSlots(slots: TimeSlot[]): string {
  if (slots.length === 0) return '요일 없음'
  const sorted = sortSlots(slots)
  const sameTime = sorted.every((slot) => slot.start === sorted[0].start && slot.end === sorted[0].end)
  if (sameTime) {
    return `${sorted.map((slot) => WEEKDAY_NAMES[slot.weekday]).join('·')} ${sorted[0].start}~${sorted[0].end}`
  }
  return sorted.map((slot) => `${WEEKDAY_NAMES[slot.weekday]} ${slot.start}~${slot.end}`).join(', ')
}

export const FEE_PLAN_LABELS: Record<FeePlan['type'], string> = {
  monthly: '월 단위',
  sessions: '회차 단위',
  period: '기간 단위',
}

export function describeDueDay(dueDay: number): string {
  return dueDay >= 31 ? '매월 말일' : `매월 ${dueDay}일`
}

/** 예: '월 25만 원 · 매월 5일', '8회 20만 원', '3개월 60만 원' */
export function describeFee(plan: FeePlan): string {
  switch (plan.type) {
    case 'monthly':
      return `월 ${formatWon(plan.amount)} · ${describeDueDay(plan.dueDay)}`
    case 'sessions':
      return `${plan.sessionCount}회 ${formatWon(plan.amount)}`
    case 'period':
      return `${plan.months}개월 ${formatWon(plan.amount)}`
  }
}

export const ABSENCE_COUNTING_LABELS: Record<AbsenceCounting, string> = {
  never: '결석은 회차로 세지 않음',
  always: '결석도 회차로 셈',
  ifNoMakeup: '보강을 안 하면 회차로 셈',
}

export function describeMakeupWindow(window: MakeupWindow): string {
  switch (window.type) {
    case 'days':
      return `결석일로부터 ${window.days}일 이내`
    case 'sameMonth':
      return '같은 달 안'
    case 'nextMonthEnd':
      return '다음 달 말까지'
    case 'none':
      return '기한 없음'
  }
}

/** 예: '결석·휴강 보강 · 결석일로부터 14일 이내 · 한 달 2회까지', 보강이 없으면 '보강 없음' */
export function describeMakeupRule(rule: MakeupRule): string {
  const targets = [rule.forAbsence && '결석', rule.forCancellation && '휴강'].filter(Boolean)
  if (targets.length === 0) return '보강 없음'
  const parts = [`${targets.join('·')} 보강`, describeMakeupWindow(rule.window)]
  if (rule.monthlyLimit !== null) parts.push(`한 달 ${rule.monthlyLimit}회까지`)
  return parts.join(' · ')
}

export function defaultMakeupRule(): MakeupRule {
  return {
    forAbsence: true,
    forCancellation: true,
    window: { type: 'days', days: 14 },
    slots: [],
    monthlyLimit: null,
  }
}
