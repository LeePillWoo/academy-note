import { addDays, addMonths, daysBetween, endOfMonth, formatDate, startOfMonth, weekdayOf, type DateStr, type TimeStr } from '../utils/date'
import { describeSlots, periodAt } from './academyRules'
import type { Academy, LessonStatus, Makeup, MakeupRule } from './types'

/** 이 수업 상태가 학원 규칙상 보강 대상인지 */
export function qualifiesForMakeup(rule: MakeupRule, status: LessonStatus): status is 'absent' | 'cancelled' {
  return (status === 'absent' && rule.forAbsence) || (status === 'cancelled' && rule.forCancellation)
}

/** 보강 기한. undefined면 기한 없음 */
export function makeupDeadline(rule: MakeupRule, missedOn: DateStr): DateStr | undefined {
  switch (rule.window.type) {
    case 'days':
      return addDays(missedOn, rule.window.days)
    case 'sameMonth':
      return endOfMonth(missedOn)
    case 'nextMonthEnd':
      return endOfMonth(addMonths(startOfMonth(missedOn), 1))
    case 'none':
      return undefined
  }
}

/** 화면에 보여주는 보강 상태: 미정, 예정, 완료, 기한 만료, 보강 안 함 */
export type MakeupState = 'pending' | 'scheduled' | 'done' | 'expired' | 'skipped'

export const MAKEUP_STATE_LABELS: Record<MakeupState, string> = {
  pending: '미정',
  scheduled: '예정',
  done: '완료',
  expired: '기한 만료',
  skipped: '보강 안 함',
}

/** 기한 만료는 따로 저장하지 않고, 날짜를 정하지 않은 채 기한이 지나면 그렇게 봅니다. */
export function makeupState(makeup: Makeup, todayStr: DateStr): MakeupState {
  if (makeup.status === 'done') return 'done'
  if (makeup.status === 'skipped') return 'skipped'
  if (makeup.scheduledOn) return 'scheduled'
  if (makeup.deadline && makeup.deadline < todayStr) return 'expired'
  return 'pending'
}

/** 남은 보강인지 (미정, 예정) */
export function isOpenState(state: MakeupState): boolean {
  return state === 'pending' || state === 'scheduled'
}

/** 예: '11월 13일 (금)까지 · 14일 남음', '오늘까지', '기한 없음' */
export function describeDeadline(deadline: DateStr | undefined, todayStr: DateStr): string {
  if (!deadline) return '기한 없음'
  const left = daysBetween(todayStr, deadline)
  if (left < 0) return `${formatDate(deadline)}까지였음`
  if (left === 0) return '오늘까지'
  return `${formatDate(deadline)}까지 · ${left}일 남음`
}

/** 남은 보강을 급한 순서로: 예정일이 있으면 예정일, 없으면 기한 (기한 없음은 맨 뒤) */
export function urgencyKey(makeup: Makeup): string {
  return makeup.scheduledOn ?? makeup.deadline ?? '9999-12-31'
}

/** 보강 날짜를 잡을 때 기본 시각: 보강 가능 시간 → 원래 수업 시각 → 16:00~17:00 */
export function defaultMakeupTime(academy: Academy, date: DateStr): { start: TimeStr; end: TimeStr } {
  const weekday = weekdayOf(date)
  const slot =
    academy.makeupRule.slots.find((item) => item.weekday === weekday) ??
    periodAt(academy.schedules, date).find((item) => item.weekday === weekday) ??
    periodAt(academy.schedules, date)[0]
  return slot ? { start: slot.start, end: slot.end } : { start: '16:00', end: '17:00' }
}

/** 보강 날짜가 학원 규칙에 맞는지 검사합니다. 맞지 않아도 저장은 되고, 알려주기만 합니다. */
export function scheduleWarnings(input: {
  makeup: Makeup
  academy: Academy
  makeups: Makeup[]
  date: DateStr
  start?: TimeStr
  end?: TimeStr
}): string[] {
  const { makeup, academy, makeups, date, start, end } = input
  const rule = academy.makeupRule
  const warnings: string[] = []

  if (makeup.deadline && date > makeup.deadline) {
    warnings.push(`보강 기한(${formatDate(makeup.deadline)})이 지난 날짜입니다.`)
  }

  if (rule.slots.length > 0) {
    const slot = rule.slots.find((item) => item.weekday === weekdayOf(date))
    if (!slot) warnings.push(`보강 가능 요일이 아닙니다. (가능: ${describeSlots(rule.slots)})`)
    else if (start && end && (start < slot.start || end > slot.end)) {
      warnings.push(`보강 가능 시간(${slot.start}~${slot.end})을 벗어납니다.`)
    }
  }

  if (rule.monthlyLimit !== null) {
    const month = date.slice(0, 7)
    const count = makeups.filter(
      (other) =>
        other.id !== makeup.id &&
        other.academyId === makeup.academyId &&
        other.status !== 'skipped' &&
        other.scheduledOn?.startsWith(month),
    ).length
    if (count >= rule.monthlyLimit) warnings.push(`이 달 보강이 이미 ${count}회입니다. (한 달 최대 ${rule.monthlyLimit}회)`)
  }

  return warnings
}
