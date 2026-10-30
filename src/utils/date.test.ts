import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  dayOfMonthClamped,
  daysBetween,
  endOfMonth,
  formatDate,
  isValidDate,
  isValidTime,
  startOfMonth,
  weekdayOf,
} from './date'

describe('날짜 계산', () => {
  it('며칠 뒤: 달과 해가 바뀌어도 맞음', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('몇 달 뒤: 그 달에 없는 날은 말일로', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
  })

  it('달의 시작과 끝', () => {
    expect(startOfMonth('2026-10-30')).toBe('2026-10-01')
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28')
    expect(dayOfMonthClamped(2026, 2, 31)).toBe('2026-02-28')
    expect(dayOfMonthClamped(2026, 4, 31)).toBe('2026-04-30')
  })

  it('요일: 2026-10-30은 금요일', () => {
    expect(weekdayOf('2026-10-30')).toBe(5)
    expect(weekdayOf('2026-11-01')).toBe(0)
  })

  it('두 날짜 사이 날 수 (서머타임 없는 한국 기준)', () => {
    expect(daysBetween('2026-10-30', '2026-11-13')).toBe(14)
    expect(daysBetween('2026-11-13', '2026-10-30')).toBe(-14)
  })

  it('날짜 보여주기', () => {
    expect(formatDate('2026-10-30', { withYear: false })).toBe('10월 30일 (금)')
    expect(formatDate('2025-03-02', { withYear: true })).toBe('2025년 3월 2일 (일)')
  })

  it('올바른 날짜와 시각인지 검사', () => {
    expect(isValidDate('2026-02-29')).toBe(false)
    expect(isValidDate('2028-02-29')).toBe(true)
    expect(isValidDate('2026-1-5')).toBe(false)
    expect(isValidTime('17:30')).toBe(true)
    expect(isValidTime('24:00')).toBe(false)
  })
})
