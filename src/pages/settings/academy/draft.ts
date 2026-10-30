import type { AcademyInput } from '../../../data/academies'
import { defaultMakeupRule } from '../../../data/academyRules'
import { newId } from '../../../data/id'
import type { AbsenceCounting, Academy, FeePlan, FeePlanType, MakeupRule, Period, TimeSlot } from '../../../data/types'
import { dateParts, isValidTime, today, type DateStr } from '../../../utils/date'
import { formatNumber, parseAmount } from '../../../utils/money'

/**
 * 입력 중인 수강료. 방식을 바꿔도 다른 방식의 입력값이 남도록 모든 칸을 함께 둡니다.
 * 금액은 입력한 글자 그대로 두고 저장할 때 숫자로 바꿉니다.
 */
export interface FeeDraft {
  type: FeePlanType
  amountText: string
  dueDay: number
  sessionCount: number
  absenceCounting: AbsenceCounting
  usedAtStart: number
  months: number
  firstDueOn: DateStr
}

/** 입력 중인 학원 */
export interface AcademyDraft {
  id?: string
  childId: string
  name: string
  color: string
  memo: string
  startedOn: DateStr
  endedOn?: DateStr
  schedules: Period<TimeSlot[]>[]
  fees: Period<FeeDraft>[]
  makeupRule: MakeupRule
}

export type DraftErrors = Partial<Record<'name' | 'schedules' | 'fees' | 'makeup', string>>

export function defaultFeeDraft(startedOn: DateStr): FeeDraft {
  return {
    type: 'monthly',
    amountText: '',
    dueDay: Math.min(dateParts(startedOn).day, 31),
    sessionCount: 8,
    absenceCounting: 'never',
    usedAtStart: 0,
    months: 3,
    firstDueOn: startedOn,
  }
}

export function newAcademyDraft(childId: string, color: string): AcademyDraft {
  const startedOn = today()
  return {
    childId,
    name: '',
    color,
    memo: '',
    startedOn,
    schedules: [{ id: newId(), startsOn: startedOn, value: [] }],
    fees: [{ id: newId(), startsOn: startedOn, value: defaultFeeDraft(startedOn) }],
    makeupRule: defaultMakeupRule(),
  }
}

function feeDraftFromPlan(plan: FeePlan, startedOn: DateStr): FeeDraft {
  const base = { ...defaultFeeDraft(startedOn), type: plan.type, amountText: formatNumber(plan.amount) }
  switch (plan.type) {
    case 'monthly':
      return { ...base, dueDay: plan.dueDay }
    case 'sessions':
      return { ...base, sessionCount: plan.sessionCount, absenceCounting: plan.absenceCounting, usedAtStart: plan.usedAtStart }
    case 'period':
      return { ...base, months: plan.months, firstDueOn: plan.firstDueOn }
  }
}

export function draftFromAcademy(academy: Academy): AcademyDraft {
  return {
    id: academy.id,
    childId: academy.childId,
    name: academy.name,
    color: academy.color,
    memo: academy.memo,
    startedOn: academy.startedOn,
    endedOn: academy.endedOn,
    schedules: academy.schedules,
    fees: academy.fees.map((period) => ({ ...period, value: feeDraftFromPlan(period.value, academy.startedOn) })),
    makeupRule: academy.makeupRule,
  }
}

function feePlanFromDraft(draft: FeeDraft, amount: number, isFirst: boolean): FeePlan {
  switch (draft.type) {
    case 'monthly':
      return { type: 'monthly', amount, dueDay: draft.dueDay }
    case 'sessions':
      return {
        type: 'sessions',
        amount,
        sessionCount: draft.sessionCount,
        absenceCounting: draft.absenceCounting,
        // 이미 들은 회차는 앱 기록을 시작할 때(첫 기간)만 의미가 있습니다.
        usedAtStart: isFirst ? Math.min(draft.usedAtStart, draft.sessionCount - 1) : 0,
      }
    case 'period':
      return { type: 'period', amount, months: draft.months, firstDueOn: draft.firstDueOn }
  }
}

/** 시간대 목록 검사. 문제가 없으면 null */
function slotsError(slots: TimeSlot[]): string | null {
  for (const slot of slots) {
    if (!isValidTime(slot.start) || !isValidTime(slot.end)) return '시각을 모두 넣으세요.'
    if (slot.end <= slot.start) return '끝 시각은 시작 시각보다 늦어야 합니다.'
  }
  return null
}

/** 변경 기간의 시작일 검사. 수강 시작일보다 뒤이고 서로 달라야 합니다. */
function periodStartsError(periods: Period<unknown>[], startedOn: DateStr): string | null {
  const later = periods.slice(1).map((period) => period.startsOn)
  if (later.some((date) => date <= startedOn)) return '변경 적용 시작일은 수강 시작일보다 뒤여야 합니다.'
  if (new Set(later).size !== later.length) return '변경 적용 시작일이 겹칩니다.'
  return null
}

/** 입력을 검사하고, 문제가 없으면 저장할 내용을 만듭니다. */
export function validateDraft(draft: AcademyDraft): { errors: DraftErrors; input?: AcademyInput } {
  const errors: DraftErrors = {}

  const name = draft.name.trim()
  if (!name) errors.name = '학원 이름을 입력하세요.'

  const scheduleProblem =
    periodStartsError(draft.schedules, draft.startedOn) ??
    (draft.schedules.some((period) => period.value.length === 0) ? '수업 요일을 하나 이상 고르세요.' : null) ??
    draft.schedules.map((period) => slotsError(period.value)).find(Boolean) ??
    null
  if (scheduleProblem) errors.schedules = scheduleProblem

  const amounts = draft.fees.map((period) => parseAmount(period.value.amountText))
  const feeProblem =
    periodStartsError(draft.fees, draft.startedOn) ?? (amounts.some((amount) => amount === null) ? '수강료 금액을 입력하세요.' : null)
  if (feeProblem) errors.fees = feeProblem

  const makeupProblem = slotsError(draft.makeupRule.slots)
  if (makeupProblem) errors.makeup = `보강 가능 시간: ${makeupProblem}`

  if (Object.keys(errors).length > 0) return { errors }

  return {
    errors,
    input: {
      id: draft.id,
      childId: draft.childId,
      name,
      color: draft.color,
      memo: draft.memo.trim(),
      startedOn: draft.startedOn,
      endedOn: draft.endedOn,
      schedules: draft.schedules,
      fees: draft.fees.map((period, index) => ({
        ...period,
        value: feePlanFromDraft(period.value, amounts[index]!, index === 0),
      })),
      makeupRule: draft.makeupRule,
    },
  }
}
