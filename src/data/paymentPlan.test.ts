import { describe, expect, it } from 'vitest'
import { defaultMakeupRule } from './academyRules'
import { buildPaymentViews, countedSessionDates, plannedDues, sessionProgress, type FeeContext } from './paymentPlan'
import type { Academy, FeePlan, Lesson, Payment } from './types'

/** 월·수 수업 학원 (2026-10-05 월요일부터) */
function academy(plan: FeePlan, startedOn = '2026-10-05'): Academy {
  return {
    id: 'a1',
    childId: 'c1',
    name: '영어학원',
    color: '#3b82f6',
    memo: '',
    order: 0,
    startedOn,
    schedules: [{ id: 's1', startsOn: startedOn, value: [{ weekday: 1, start: '17:00', end: '18:00' }, { weekday: 3, start: '17:00', end: '18:00' }] }],
    fees: [{ id: 'f1', startsOn: startedOn, value: plan }],
    makeupRule: defaultMakeupRule(),
    createdAt: '',
    updatedAt: '',
  }
}

const context = (todayStr: string, lessons: Lesson[] = []): FeeContext => ({ lessons, makeups: [], todayStr })

const absent = (date: string): Lesson => ({ id: `l-${date}`, academyId: 'a1', date, status: 'absent', memo: '', createdAt: '', updatedAt: '' })

describe('수강료 납부 항목 계산', () => {
  it('월 단위: 수강 시작일 뒤의 납부일부터 매월', () => {
    const dues = plannedDues(academy({ type: 'monthly', amount: 250_000, dueDay: 5 }, '2026-10-30'), '2027-01-31', context('2026-10-30'))
    expect(dues.map((due) => [due.dueOn, due.title, due.amount])).toEqual([
      ['2026-11-05', '11월분', 250_000],
      ['2026-12-05', '12월분', 250_000],
      ['2027-01-05', '1월분', 250_000],
    ])
  })

  it('월 단위: 말일 납부는 달마다 말일', () => {
    const dues = plannedDues(academy({ type: 'monthly', amount: 1, dueDay: 31 }, '2026-10-01'), '2026-12-31', context('2026-10-01'))
    expect(dues.map((due) => due.dueOn)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31'])
  })

  it('기간 단위: 첫 납부일부터 N개월마다', () => {
    const dues = plannedDues(academy({ type: 'period', amount: 600_000, months: 3, firstDueOn: '2026-11-01' }), '2027-06-30', context('2026-10-05'))
    expect(dues.map((due) => [due.dueOn, due.title])).toEqual([
      ['2026-11-01', '3개월분'],
      ['2027-02-01', '3개월분'],
      ['2027-05-01', '3개월분'],
    ])
  })

  it('회차 단위: 묶음의 첫 수업일이 납부일 (4회마다)', () => {
    const plan: FeePlan = { type: 'sessions', amount: 200_000, sessionCount: 4, absenceCounting: 'never', usedAtStart: 0 }
    // 수업: 10-05(월) 10-07(수) 10-12 10-14 | 10-19 10-21 10-26 10-28 | 11-02 …
    const dues = plannedDues(academy(plan), '2026-11-02', context('2026-10-05'))
    expect(dues.map((due) => due.dueOn)).toEqual(['2026-10-05', '2026-10-19', '2026-11-02'])
  })

  it('회차 단위: 결석을 세지 않으면 다음 납부일이 밀림', () => {
    const plan: FeePlan = { type: 'sessions', amount: 200_000, sessionCount: 4, absenceCounting: 'never', usedAtStart: 0 }
    const dues = plannedDues(academy(plan), '2026-10-31', context('2026-10-05', [absent('2026-10-07')]))
    expect(dues.map((due) => due.dueOn)).toEqual(['2026-10-05', '2026-10-21'])
    // 결석도 세면 그대로
    const always = plannedDues(academy({ ...plan, absenceCounting: 'always' }), '2026-10-31', context('2026-10-05', [absent('2026-10-07')]))
    expect(always.map((due) => due.dueOn)).toEqual(['2026-10-05', '2026-10-19'])
  })

  it('회차 단위: 이미 들은 회차가 있으면 지금 묶음은 낸 것으로 보고 다음 묶음부터', () => {
    const plan: FeePlan = { type: 'sessions', amount: 200_000, sessionCount: 4, absenceCounting: 'never', usedAtStart: 2 }
    const dues = plannedDues(academy(plan), '2026-10-31', context('2026-10-05'))
    expect(dues.map((due) => due.dueOn)).toEqual(['2026-10-12', '2026-10-26'])
  })

  it('회차 진행: 오늘 수업은 기록이 없으면(예정) 아직 세지 않음, 다 쓴 묶음은 4/4로', () => {
    const plan: FeePlan = { type: 'sessions', amount: 200_000, sessionCount: 4, absenceCounting: 'never', usedAtStart: 1 }
    // 이미 1회 + 지난 수업 10-05, 10-07, 10-12 = 4회. 오늘(10-14)은 아직 안 들어서 세지 않음
    // → 묶음을 다 써서 4/4, 다음 납부는 새 묶음 첫 수업인 오늘
    expect(sessionProgress(academy(plan), context('2026-10-14'))).toEqual({ used: 4, total: 4, nextDueOn: '2026-10-14', undecidedMakeups: 0 })
    // 오늘 출석을 기록하면 셈 → 새 묶음 1회째. 새 묶음 값은 아직 안 냈으니 다음 납부는 그대로 오늘
    const attended: Lesson = { id: 'l-today', academyId: 'a1', date: '2026-10-14', status: 'attended', memo: '', createdAt: '', updatedAt: '' }
    expect(sessionProgress(academy(plan), context('2026-10-14', [attended]))).toEqual({ used: 1, total: 4, nextDueOn: '2026-10-14', undecidedMakeups: 0 })
    expect(sessionProgress(academy({ type: 'monthly', amount: 1, dueDay: 5 }), context('2026-10-14'))).toBeNull()
  })

  it('다음 납부일: 미리 냈거나 자동납부로 처리된 묶음은 건너뜀', () => {
    const plan: FeePlan = { type: 'sessions', amount: 200_000, sessionCount: 4, absenceCounting: 'never', usedAtStart: 1 }
    // 오늘(10-14)이 납부일인 묶음(a1|s|f1|1)을 미리 냈으면 다음 묶음 10-28
    const paid: Payment = {
      id: 'p1', academyId: 'a1', kind: 'tuition', dueKey: 'a1|s|f1|1', title: '4회분',
      dueOn: '2026-10-14', amount: 200_000, paidOn: '2026-10-12', memo: '', createdAt: '', updatedAt: '',
    }
    expect(sessionProgress(academy(plan), context('2026-10-14'), [paid])?.nextDueOn).toBe('2026-10-28')
    // 자동납부 학원이면 오늘 납부일은 자동으로 낸 것이라 다음 묶음을 보여줌
    expect(sessionProgress({ ...academy(plan), autoPayment: true }, context('2026-10-14'))?.nextDueOn).toBe('2026-10-28')
  })

  it('수강료 변경: 바뀌는 날 기준 이미 들은 회차를 넣으면 묶음이 이어짐', () => {
    // 10-05부터 4회 20만. 10-13부터 금액 인상(4회 24만), 그날 기준 지금 묶음에서 2회 들음
    const changed: Academy = {
      ...academy({ type: 'sessions', amount: 200_000, sessionCount: 4, absenceCounting: 'never', usedAtStart: 0 }),
      fees: [
        { id: 'f1', startsOn: '2026-10-05', value: { type: 'sessions', amount: 200_000, sessionCount: 4, absenceCounting: 'never', usedAtStart: 0 } },
        { id: 'f2', startsOn: '2026-10-13', value: { type: 'sessions', amount: 240_000, sessionCount: 4, absenceCounting: 'never', usedAtStart: 2 } },
      ],
    }
    // 수업: 10-05, 07, 12 (옛 기간) | 10-14, 19, 21, 26, 28 … (새 기간)
    // 옛 묶음을 2회 쓰고 넘어왔으니 새 기간에서 2회(10-14, 19)를 더 쓰고, 10-21부터 새 묶음
    expect(plannedDues(changed, '2026-10-31', context('2026-10-05')).map((due) => [due.dueOn, due.amount])).toEqual([
      ['2026-10-05', 200_000],
      ['2026-10-21', 240_000],
    ])
    // 진행 상황도 이어서: 10-20 기준 이미 2회 + 10-14, 19 = 4회 → 다 쓴 묶음, 다음 납부 10-21
    expect(sessionProgress(changed, context('2026-10-20'))).toEqual({ used: 4, total: 4, nextDueOn: '2026-10-21', undecidedMakeups: 0 })
  })
})

describe('납부 목록', () => {
  const payment = (overrides: Partial<Payment>): Payment => ({
    id: 'p1',
    academyId: 'a1',
    kind: 'tuition',
    title: '11월분',
    dueOn: '2026-11-05',
    amount: 250_000,
    memo: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  })

  it('낸 기록이 있으면 납부 완료, 없으면 날짜에 따라 미납이나 납부일 지남, 추가 납부도 함께', () => {
    const math = academy({ type: 'monthly', amount: 250_000, dueDay: 5 }, '2026-10-01')
    const views = buildPaymentViews(
      [math],
      [
        payment({ dueKey: 'a1|m|2026-10', title: '10월분', dueOn: '2026-10-05', paidOn: '2026-10-04', amount: 240_000 }),
        payment({ id: 'p2', kind: 'textbook', title: '교재', dueOn: '2026-11-10', amount: 30_000 }),
      ],
      '2026-10-01',
      '2026-12-31',
      context('2026-11-20'),
    )
    expect(views.map((view) => [view.dueOn, view.title, view.amount, view.status])).toEqual([
      ['2026-10-05', '10월분', 240_000, 'paid'],
      ['2026-11-05', '11월분', 250_000, 'overdue'],
      ['2026-11-10', '교재', 30_000, 'overdue'],
      ['2026-12-05', '12월분', 250_000, 'unpaid'],
    ])
  })

  it('앱에 학원을 등록하기 전에 낼 날이 지난 수강료는 낸 것으로 봄', () => {
    // 10월 1일부터 다녔지만 앱에는 11월 3일에 등록
    const math = { ...academy({ type: 'monthly', amount: 250_000, dueDay: 5 }, '2026-10-01'), createdAt: '2026-11-03T01:00:00.000Z' }
    const views = buildPaymentViews([math], [], '2026-10-01', '2026-11-30', context('2026-11-20'))
    expect(views.map((view) => [view.title, view.status, view.assumed])).toEqual([
      ['10월분', 'paid', true],
      ['11월분', 'overdue', false],
    ])
  })
})

describe('회차 단위: 결석과 보강에 따라 회차가 바뀜', () => {
  // 월·수 수업, 10-05(월) 10-07(수) 10-12 10-14 10-19 10-21 … / 10-07 결석
  const plan = (absenceCounting: FeePlan extends { type: 'sessions' } ? never : import('./types').AbsenceCounting): FeePlan => ({
    type: 'sessions',
    amount: 100_000,
    sessionCount: 4,
    absenceCounting,
    usedAtStart: 0,
  })
  const absence = absent('2026-10-07')
  const makeup = (status: 'open' | 'done' | 'skipped', extra: Partial<import('./types').Makeup> = {}): import('./types').Makeup => ({
    id: 'm1',
    academyId: 'a1',
    lessonId: absence.id,
    missedOn: '2026-10-07',
    reason: 'absent',
    deadline: '2026-10-21',
    status,
    memo: '',
    createdAt: '',
    updatedAt: '',
    ...extra,
  })
  // 10-10(토)에 다녀온 보강 출석 기록
  const makeupLesson: Lesson = { id: 'l-mk', academyId: 'a1', date: '2026-10-10', status: 'makeup', memo: '', makeupId: 'm1', createdAt: '', updatedAt: '' }
  const ctx = (makeups: import('./types').Makeup[], lessons: Lesson[], todayStr = '2026-10-14'): FeeContext => ({ lessons, makeups, todayStr })
  /** 10-14까지 센 회차 수 */
  const count = (p: FeePlan, c: FeeContext) => countedSessionDates(academy(p), '2026-10-05', '2026-10-14', (p as { absenceCounting: import('./types').AbsenceCounting }).absenceCounting, c).length

  it("'결석은 세지 않음': 보강을 다녀와야 회차가 늘어남", () => {
    expect(count(plan('never'), ctx([makeup('open')], [absence]))).toBe(3) // 10-05, 10-12, 10-14
    expect(count(plan('never'), ctx([makeup('done', { doneLessonId: 'l-mk' })], [absence, makeupLesson]))).toBe(4)
  })

  it("'결석도 셈': 결석 때 이미 셌으니 보강을 다녀와도 그대로", () => {
    expect(count(plan('always'), ctx([makeup('open')], [absence]))).toBe(4)
    expect(count(plan('always'), ctx([makeup('done', { doneLessonId: 'l-mk' })], [absence, makeupLesson]))).toBe(4)
  })

  it("'결석도 셈': 휴강분 보강은 실제로 들은 수업이니 셈", () => {
    const cancelled: Lesson = { ...absence, status: 'cancelled' }
    const cancelMakeup = makeup('done', { reason: 'cancelled', doneLessonId: 'l-mk' })
    expect(count(plan('always'), ctx([cancelMakeup], [cancelled, makeupLesson]))).toBe(4) // 휴강 안 셈 + 보강 셈
  })

  it("'보강을 안 하면 셈': 미정·예정이면 아직 안 세고, 다녀오면 보강으로, 안 하거나 기한이 지나면 결석으로 셈", () => {
    expect(count(plan('ifNoMakeup'), ctx([makeup('open')], [absence]))).toBe(3)
    expect(count(plan('ifNoMakeup'), ctx([makeup('open', { scheduledOn: '2026-10-17' })], [absence]))).toBe(3)
    expect(count(plan('ifNoMakeup'), ctx([makeup('done', { doneLessonId: 'l-mk' })], [absence, makeupLesson]))).toBe(4)
    expect(count(plan('ifNoMakeup'), ctx([makeup('skipped')], [absence]))).toBe(4)
    expect(count(plan('ifNoMakeup'), ctx([makeup('open')], [absence], '2026-10-22'))).toBe(4) // 기한(10-21) 지남 → 결석을 셈
  })

  it('보강 결과에 따라 다음 납부일이 바뀜', () => {
    const p = plan('ifNoMakeup')
    // 4회 묶음: 보강 미정이면 10-07을 안 세서 5번째 수업이 10-21 → 두 번째 묶음 납부일 10-21
    expect(plannedDues(academy(p), '2026-10-31', ctx([makeup('open')], [absence])).map((d) => d.dueOn)).toEqual(['2026-10-05', '2026-10-21'])
    // 보강 안 함이면 10-07을 세서 5번째 수업이 10-19 → 납부일이 10-19로 당겨짐
    expect(plannedDues(academy(p), '2026-10-31', ctx([makeup('skipped')], [absence])).map((d) => d.dueOn)).toEqual(['2026-10-05', '2026-10-19'])
  })
})

describe('자동납부', () => {
  // 매월 5일 25만 원, 자동이체 (2026-10-01부터, 등록도 그때)
  const auto: Academy = { ...academy({ type: 'monthly', amount: 250_000, dueDay: 5 }, '2026-10-01'), autoPayment: true }

  it('납부일이 되면 기록 없이 낸 것으로, 아직 안 온 것은 자동 예정(미납)으로 봄', () => {
    const views = buildPaymentViews([auto], [], '2026-10-01', '2026-12-31', context('2026-11-20'))
    expect(views.map((view) => [view.title, view.status, view.auto, view.assumed])).toEqual([
      ['10월분', 'paid', true, false], // 납부일(10-05)이 지나 자동으로 냄
      ['11월분', 'paid', true, false],
      ['12월분', 'unpaid', true, false], // 아직 안 온 납부일: 미납이지만 자동 예정으로 표시
    ])
  })

  it('직접 기록한 납부가 있으면 기록이 우선, 추가 납부(교재비)는 자동납부와 상관없음', () => {
    const record: Payment = {
      id: 'p1', academyId: 'a1', kind: 'tuition', dueKey: 'a1|m|2026-10', title: '10월분',
      dueOn: '2026-10-05', amount: 240_000, paidOn: '2026-10-02', memo: '', createdAt: '', updatedAt: '',
    }
    const textbook: Payment = {
      id: 'p2', academyId: 'a1', kind: 'textbook', title: '교재', dueOn: '2026-11-01', amount: 30_000,
      memo: '', createdAt: '', updatedAt: '',
    }
    const views = buildPaymentViews([auto], [record, textbook], '2026-10-01', '2026-11-30', context('2026-11-20'))
    expect(views.map((view) => [view.title, view.status, view.auto, view.amount])).toEqual([
      ['10월분', 'paid', true, 240_000], // 기록(실제 낸 금액)이 우선
      ['교재', 'overdue', false, 30_000], // 교재비는 자동납부 대상이 아니라 미납 그대로
      ['11월분', 'paid', true, 250_000],
    ])
  })
})
