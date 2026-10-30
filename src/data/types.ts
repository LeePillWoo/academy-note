import type { DateStr, TimeStr, Weekday } from '../utils/date'

/** 모든 기록에 공통으로 들어가는 항목입니다. updatedAt은 백업을 합칠 때 더 최근 기록을 고르는 데 씁니다. */
export interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Child extends BaseRecord {
  name: string
  color: string
  /** 화면에 보이는 순서 (작을수록 앞) */
  order: number
}

// ===== 학원 =====

/** 요일과 시간. 예: 월 17:00~18:30 */
export interface TimeSlot {
  weekday: Weekday
  start: TimeStr
  end: TimeStr
}

/**
 * 기간별 설정. 학기 중에 수업 요일이나 수강료가 바뀌면 새 기간을 추가합니다.
 * 첫 기간은 수강 시작일부터, 다음 기간은 startsOn부터 적용됩니다. 지난 기록은 그대로 남습니다.
 */
export interface Period<T> {
  id: string
  /** 이 설정을 적용하는 첫날. 첫 기간은 수강 시작일과 같습니다. */
  startsOn: DateStr
  value: T
}

/** 회차 단위 학원에서 결석을 회차로 셀지 */
export type AbsenceCounting = 'never' | 'always' | 'ifNoMakeup'

/** 수강료 방식 */
export type FeePlan =
  | {
      type: 'monthly'
      amount: number
      /** 매월 납부일 (1~31, 그 달에 없는 날이면 말일) */
      dueDay: number
    }
  | {
      type: 'sessions'
      amount: number
      /** 몇 회마다 내는지. 예: 8 */
      sessionCount: number
      absenceCounting: AbsenceCounting
      /** 앱에 기록을 시작할 때 지금 묶음에서 이미 들은 회차 */
      usedAtStart: number
    }
  | {
      type: 'period'
      amount: number
      /** 몇 달마다 내는지. 예: 3 */
      months: number
      /** 첫 납부일. 이후 months달마다 같은 날에 냅니다. */
      firstDueOn: DateStr
    }

export type FeePlanType = FeePlan['type']

/** 보강 가능 기간 */
export type MakeupWindow =
  | { type: 'days'; days: number }
  | { type: 'sameMonth' }
  | { type: 'nextMonthEnd' }
  | { type: 'none' }

export interface MakeupRule {
  /** 결석하면 보강 */
  forAbsence: boolean
  /** 휴강하면 보강 */
  forCancellation: boolean
  window: MakeupWindow
  /** 보강 가능 요일과 시간. 비어 있으면 제한 없음 */
  slots: TimeSlot[]
  /** 한 달 최대 보강 횟수. null이면 제한 없음 */
  monthlyLimit: number | null
}

export interface Academy extends BaseRecord {
  childId: string
  name: string
  color: string
  /** 과목. 예: 수학, 피아노 */
  subject?: string
  /** 선생님. 예: 김OO 원장님 */
  teacher?: string
  /** 연락처 (누르면 전화) */
  phone?: string
  address?: string
  memo: string
  /** 화면에 보이는 순서 (작을수록 앞) */
  order: number
  /** 수강 시작일. 이날부터 수업일과 납부 항목을 만듭니다. */
  startedOn: DateStr
  /** 그만둔 날. 있으면 이날 뒤로는 수업일과 납부 항목을 만들지 않습니다. */
  endedOn?: DateStr
  /** 수업 일정 (기간별, startsOn 순서) */
  schedules: Period<TimeSlot[]>[]
  /** 수강료 (기간별, startsOn 순서) */
  fees: Period<FeePlan>[]
  makeupRule: MakeupRule
}

// ===== 수업 기록 =====

/** 출석, 결석, 휴강, 보강 출석 */
export type LessonStatus = 'attended' | 'absent' | 'cancelled' | 'makeup'

/**
 * 수업 기록. 수업일은 학원 일정에서 계산하고, 기록은 출석/결석/휴강을 직접 남긴 날만 저장합니다.
 * 일정에 있는 수업은 학원과 날짜로 찾습니다. (한 학원은 하루에 수업이 하나)
 */
export interface Lesson extends BaseRecord {
  academyId: string
  date: DateStr
  start?: TimeStr
  end?: TimeStr
  status: LessonStatus
  memo: string
  /** 보강 출석이면 어떤 보강을 한 것인지 */
  makeupId?: string
}

// ===== 보강 =====

/** 저장하는 보강 상태. 미정/예정/기한 만료는 날짜로 계산합니다. (makeupRules.ts) */
export type MakeupStatus = 'open' | 'done' | 'skipped'

/** 결석이나 휴강으로 생긴 보강 하나 */
export interface Makeup extends BaseRecord {
  academyId: string
  /** 보강하게 된 수업 기록 (결석/휴강) */
  lessonId: string
  /** 원래 수업 날짜 */
  missedOn: DateStr
  reason: 'absent' | 'cancelled'
  /** 보강 기한. 없으면 기한 없음 */
  deadline?: DateStr
  /** 예정일(완료하면 실제로 간 날)과 시각 */
  scheduledOn?: DateStr
  start?: TimeStr
  end?: TimeStr
  status: MakeupStatus
  /** 완료하면 만든 보강 출석 기록 */
  doneLessonId?: string
  memo: string
}

// ===== 납부 =====

/** 수강료, 교재비, 특강비, 기타 */
export type PaymentKind = 'tuition' | 'textbook' | 'special' | 'other'

/** 카드, 이체, 현금, 기타 */
export type PaymentMethod = 'card' | 'transfer' | 'cash' | 'other'

/**
 * 납부 기록. 수강료 납부 항목은 학원의 수강료 방식에서 계산하고(paymentPlan.ts),
 * 냈다고 기록한 것과 추가 납부(교재비 등)만 저장합니다.
 */
export interface Payment extends BaseRecord {
  academyId: string
  kind: PaymentKind
  /** 계산한 수강료 항목과 맞추는 열쇠. 추가 납부는 없음 */
  dueKey?: string
  /** 이름. 예: '11월분', '1학기 교재' */
  title: string
  /** 낼 날 */
  dueOn: DateStr
  amount: number
  /** 실제로 낸 날. 없으면 아직 안 냄 */
  paidOn?: DateStr
  method?: PaymentMethod
  memo: string
}

/** 저장하는 데이터 종류입니다. 새 종류는 여기에 추가합니다. */
export interface Collections {
  children: Child
  academies: Academy
  lessons: Lesson
  makeups: Makeup
  payments: Payment
}

export type CollectionName = keyof Collections

export type Database = { [K in CollectionName]: Collections[K][] }

/** 저장소에 보내는 변경 하나. 여러 개를 묶어 한 번에 저장합니다. */
export type Change =
  | { [K in CollectionName]: { type: 'put'; collection: K; item: Collections[K] } }[CollectionName]
  | { type: 'remove'; collection: CollectionName; id: string }
