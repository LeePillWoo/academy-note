import { describe, expect, it } from 'vitest'
import { defaultMakeupRule, describeFee, describeMakeupRule, describeSlots, normalizePeriods, periodAt } from './academyRules'
import type { Period } from './types'

describe('기간별 설정', () => {
  const periods: Period<string>[] = [
    { id: 'a', startsOn: '2026-03-01', value: '1학기' },
    { id: 'b', startsOn: '2026-09-01', value: '2학기' },
  ]

  it('날짜에 맞는 기간을 고름', () => {
    expect(periodAt(periods, '2026-05-10')).toBe('1학기')
    expect(periodAt(periods, '2026-09-01')).toBe('2학기')
    expect(periodAt(periods, '2027-01-01')).toBe('2학기')
    // 첫 기간보다 앞이면 첫 기간
    expect(periodAt(periods, '2026-01-01')).toBe('1학기')
  })

  it('정렬하고 첫 기간 시작일을 수강 시작일로 맞춤', () => {
    const result = normalizePeriods([periods[1], periods[0]], '2026-02-15')
    expect(result.map((p) => [p.startsOn, p.value])).toEqual([
      ['2026-02-15', '1학기'],
      ['2026-09-01', '2학기'],
    ])
  })
})

describe('요약 글', () => {
  it('수업 요일: 시간이 같으면 묶어서', () => {
    expect(
      describeSlots([
        { weekday: 5, start: '17:00', end: '18:30' },
        { weekday: 1, start: '17:00', end: '18:30' },
        { weekday: 3, start: '17:00', end: '18:30' },
      ]),
    ).toBe('월·수·금 17:00~18:30')
  })

  it('수업 요일: 시간이 다르면 따로, 일요일은 맨 뒤', () => {
    expect(
      describeSlots([
        { weekday: 0, start: '10:00', end: '12:00' },
        { weekday: 2, start: '16:00', end: '17:00' },
      ]),
    ).toBe('화 16:00~17:00, 일 10:00~12:00')
  })

  it('수강료', () => {
    expect(describeFee({ type: 'monthly', amount: 250_000, dueDay: 5 })).toBe('월 25만 원 · 매월 5일')
    expect(describeFee({ type: 'monthly', amount: 250_000, dueDay: 31 })).toBe('월 25만 원 · 매월 말일')
    expect(describeFee({ type: 'sessions', amount: 200_000, sessionCount: 8, absenceCounting: 'never', usedAtStart: 0 })).toBe('8회 20만 원')
    expect(describeFee({ type: 'period', amount: 600_000, months: 3, firstDueOn: '2026-11-01' })).toBe('3개월 60만 원')
  })

  it('보강 규칙', () => {
    expect(describeMakeupRule(defaultMakeupRule())).toBe('결석·휴강 보강 · 결석일로부터 14일 이내')
    expect(
      describeMakeupRule({ ...defaultMakeupRule(), forCancellation: false, window: { type: 'sameMonth' }, monthlyLimit: 2 }),
    ).toBe('결석 보강 · 같은 달 안 · 한 달 2회까지')
    expect(describeMakeupRule({ ...defaultMakeupRule(), forAbsence: false, forCancellation: false })).toBe('보강 없음')
  })
})
