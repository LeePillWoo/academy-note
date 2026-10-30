import { addDays, addMonths, dateParts, dayOfMonthClamped, startOfMonth, toDateStr, type DateStr } from '../utils/date'
import { buildLessonViews } from './lessonPlan'
import { makeupState } from './makeupRules'
import type { AbsenceCounting, Academy, FeePlan, Lesson, Makeup, Payment, PaymentKind, PaymentMethod } from './types'

/** 수강료 계산에 필요한 기록 */
export interface FeeContext {
  lessons: Lesson[]
  makeups: Makeup[]
  todayStr: DateStr
}

/** 수강료 방식에서 계산한 납부 항목 하나 */
export interface PlannedDue {
  key: string
  academyId: string
  dueOn: DateStr
  amount: number
  title: string
}

/** 회차 단위 학원에서 묶음을 계산할 때 앞으로의 수업을 얼마나 내다볼지 */
const SESSION_LOOKAHEAD_DAYS = 180

/**
 * 회차로 세는 수업 날짜 (날짜 순서). 앞으로의 수업도 예정대로 세어 다음 납부일을 미리 알 수 있게 합니다.
 * - 출석, 예정: 셈 / 휴강: 안 셈
 * - 결석: 'always'면 셈, 'never'면 안 셈, 'ifNoMakeup'이면 보강이 안 되는 것(보강 안 함, 기한 만료, 보강 없음)만 셈
 * - 보강 출석: 셈. 다만 'always'에서 결석분 보강은 결석을 이미 셌으므로 안 셈 (휴강분 보강은 셈)
 *
 * 결과: 결석 하나에 보강까지 다녀오면 어느 방식이든 회차는 정확히 1 늘어납니다.
 * 'ifNoMakeup'은 보강이 미정·예정인 동안 결석이 회차에 안 들어가고, 보강 안 함·기한 만료가 되면 그때 들어갑니다.
 */
export function countedSessionDates(
  academy: Academy,
  from: DateStr,
  to: DateStr,
  counting: AbsenceCounting,
  context: FeeContext,
): DateStr[] {
  const views = buildLessonViews([academy], context.lessons, from, to, context.todayStr)
  return views
    .filter((view) => {
      switch (view.status) {
        case 'attended':
        case 'planned':
          return true
        case 'cancelled':
          return false
        case 'makeup': {
          if (counting !== 'always') return true
          const makeup = context.makeups.find((item) => item.id === view.record?.makeupId)
          return makeup?.reason !== 'absent'
        }
        case 'absent': {
          if (counting === 'always') return true
          if (counting === 'never') return false
          const makeup = context.makeups.find((item) => item.lessonId === view.record?.id)
          if (!makeup) return true
          const state = makeupState(makeup, context.todayStr)
          return state === 'skipped' || state === 'expired'
        }
      }
    })
    .map((view) => view.date)
}

/** until까지의 수강료 납부 항목 (수강 시작일부터, 기간별 수강료 방식을 따라) */
export function plannedDues(academy: Academy, until: DateStr, context: FeeContext): PlannedDue[] {
  const result: PlannedDue[] = []
  academy.fees.forEach((period, index) => {
    const start = index === 0 ? academy.startedOn : period.startsOn
    const nextStart = academy.fees[index + 1]?.startsOn
    const periodEnd = minDate(nextStart ? addDays(nextStart, -1) : undefined, academy.endedOn)
    const end = minDate(until, periodEnd)!
    if (start > end) return
    const add = (key: string, dueOn: DateStr, title: string) =>
      result.push({ key: `${academy.id}|${key}`, academyId: academy.id, dueOn, amount: period.value.amount, title })
    const plan: FeePlan = period.value

    switch (plan.type) {
      case 'monthly': {
        for (let month = startOfMonth(start); month <= end; month = addMonths(month, 1)) {
          const { year, month: monthNumber } = dateParts(month)
          const dueOn = dayOfMonthClamped(year, monthNumber, plan.dueDay)
          if (dueOn >= start && dueOn <= end) add(`m|${month.slice(0, 7)}`, dueOn, `${monthNumber}월분`)
        }
        break
      }
      case 'period': {
        for (let k = 0; ; k++) {
          const dueOn = addMonths(plan.firstDueOn, k * plan.months)
          if (dueOn > end) break
          if (dueOn >= start) add(`p|${period.id}|${k}`, dueOn, `${plan.months}개월분`)
        }
        break
      }
      case 'sessions': {
        // 묶음의 첫 수업일이 납부일입니다. 기간이 끝나기 전까지의 수업을 셉니다.
        const sessionsTo = minDate(periodEnd, addDays(end, SESSION_LOOKAHEAD_DAYS))!
        const dates = countedSessionDates(academy, start, sessionsTo, plan.absenceCounting, context)
        const used = index === 0 ? plan.usedAtStart : 0
        // 이미 들은 회차가 있으면 지금 묶음은 이미 낸 것이므로 다음 묶음부터 셉니다.
        let block = used > 0 ? 1 : 0
        for (let first = used > 0 ? plan.sessionCount - used : 0; first < dates.length; first += plan.sessionCount, block++) {
          if (dates[first] > end) break
          add(`s|${period.id}|${block}`, dates[first], `${plan.sessionCount}회분`)
        }
        break
      }
    }
  })
  return result
}

function minDate(...dates: (DateStr | undefined)[]): DateStr | undefined {
  return dates.filter((date): date is DateStr => !!date).sort()[0]
}

/** 회차 단위 학원의 지금 묶음: 몇 회째인지, 다음 납부일 */
export interface SessionProgress {
  used: number
  total: number
  nextDueOn?: DateStr
  /** '보강을 안 하면 셈' 학원에서 아직 결과가 안 난(미정·예정) 결석분 보강 수. 결과에 따라 회차가 바뀝니다. */
  undecidedMakeups: number
}

/** 회차 단위 학원이면 지금 묶음의 진행 상황, 아니면 null */
export function sessionProgress(academy: Academy, context: FeeContext): SessionProgress | null {
  const { todayStr } = context
  const index = academy.fees.reduce((found, period, i) => (period.startsOn <= todayStr ? i : found), 0)
  const period = academy.fees[index]
  if (period.value.type !== 'sessions') return null
  const plan = period.value
  const start = index === 0 ? academy.startedOn : period.startsOn
  const counted = countedSessionDates(academy, start, todayStr, plan.absenceCounting, context).length
  const total = (index === 0 ? plan.usedAtStart : 0) + counted
  const nextDueOn = plannedDues(academy, addDays(todayStr, SESSION_LOOKAHEAD_DAYS), context).find(
    (due) => due.dueOn > todayStr && due.key.includes(`|s|${period.id}|`),
  )?.dueOn
  const undecidedMakeups =
    plan.absenceCounting === 'ifNoMakeup'
      ? context.makeups.filter((makeup) => {
          if (makeup.academyId !== academy.id || makeup.reason !== 'absent') return false
          const state = makeupState(makeup, todayStr)
          return state === 'pending' || state === 'scheduled'
        }).length
      : 0
  return { used: total % plan.sessionCount, total: plan.sessionCount, nextDueOn, undecidedMakeups }
}

// ===== 화면에 보여줄 납부 =====

/** 납부 완료, 미납(아직 낼 날 전), 납부일 지남 */
export type PaymentStatus = 'paid' | 'unpaid' | 'overdue'

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: '납부 완료',
  unpaid: '미납',
  overdue: '납부일 지남',
}

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  tuition: '수강료',
  textbook: '교재비',
  special: '특강비',
  other: '기타',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: '카드',
  transfer: '이체',
  cash: '현금',
  other: '기타',
}

export interface PaymentView {
  key: string
  academyId: string
  kind: PaymentKind
  title: string
  dueOn: DateStr
  amount: number
  /** 수강료 방식에서 계산한 항목인지 (추가 납부는 false) */
  planned: boolean
  record?: Payment
  status: PaymentStatus
  /** 앱에 학원을 등록하기 전 항목이라 기록 없이 낸 것으로 본 것 */
  assumed: boolean
}

/** 학원을 앱에 등록한 날 (createdAt을 이 기기의 날짜로) */
function registeredOn(academy: Academy): DateStr | undefined {
  const date = new Date(academy.createdAt)
  return Number.isNaN(date.getTime()) ? undefined : toDateStr(date)
}

/** from~to 사이에 낼 날이 있는 납부 (수강료 계산 + 기록). 낼 날 순서 */
export function buildPaymentViews(
  academies: Academy[],
  payments: Payment[],
  from: DateStr,
  to: DateStr,
  context: FeeContext,
): PaymentView[] {
  const views = new Map<string, Omit<PaymentView, 'status' | 'assumed'>>()
  for (const academy of academies) {
    for (const due of plannedDues(academy, to, context)) {
      if (due.dueOn < from) continue
      views.set(due.key, { ...due, kind: 'tuition', planned: true })
    }
  }

  const academyIds = new Set(academies.map((academy) => academy.id))
  for (const record of payments) {
    if (!academyIds.has(record.academyId)) continue
    const key = record.dueKey ?? `extra|${record.id}`
    const existing = views.get(key)
    // 계산한 항목이 없어진 기록(수강료 방식을 바꾼 경우 등)도 숨기지 않고 기록의 날짜로 보여줍니다.
    if (!existing && (record.dueOn < from || record.dueOn > to)) continue
    views.set(key, {
      key,
      academyId: record.academyId,
      kind: record.kind,
      title: record.title,
      dueOn: existing?.dueOn ?? record.dueOn,
      amount: record.amount,
      planned: existing?.planned ?? false,
      record,
    })
  }

  const academyOrder = new Map(academies.map((academy, index) => [academy.id, index]))
  const registered = new Map(academies.map((academy) => [academy.id, registeredOn(academy)]))
  return [...views.values()]
    .map((view): PaymentView => {
      if (view.record?.paidOn) return { ...view, status: 'paid', assumed: false }
      // 앱에 학원을 등록하기 전에 낼 날이 지난 수강료는 이미 낸 것으로 봅니다. (지난 미납이 잔뜩 쌓이지 않게)
      const before = registered.get(view.academyId)
      if (view.planned && before && view.dueOn < before) return { ...view, status: 'paid', assumed: true }
      return { ...view, status: view.dueOn < context.todayStr ? 'overdue' : 'unpaid', assumed: false }
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || (academyOrder.get(a.academyId) ?? 0) - (academyOrder.get(b.academyId) ?? 0))
}
