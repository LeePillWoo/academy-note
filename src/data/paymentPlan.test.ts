import { describe, expect, it } from 'vitest'
import { defaultMakeupRule } from './academyRules'
import { buildPaymentViews, plannedDues, sessionProgress, type FeeContext } from './paymentPlan'
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

  it('회차 진행 상황과 다음 납부일', () => {
    const plan: FeePlan = { type: 'sessions', amount: 200_000, sessionCount: 4, absenceCounting: 'never', usedAtStart: 1 }
    // 이미 1회 + 10-05, 10-07, 10-12, 10-14 = 5회 → 지금 묶음 1회째, 다음 납부는 묶음 첫 수업 10-28
    expect(sessionProgress(academy(plan), context('2026-10-14'))).toEqual({ used: 1, total: 4, nextDueOn: '2026-10-28' })
    expect(sessionProgress(academy({ type: 'monthly', amount: 1, dueDay: 5 }), context('2026-10-14'))).toBeNull()
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
