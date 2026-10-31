import { describe, expect, it } from 'vitest'
import { formatWeekRange, startOfWeek, weekDates, weekOffset } from './week'

// 2026-10-26은 월요일, 2026-10-30은 금요일, 2026-11-01은 일요일
describe('주 계산 (월요일 시작)', () => {
  it('주의 시작은 월요일. 일요일도 그 주의 월요일로', () => {
    expect(startOfWeek('2026-10-30')).toBe('2026-10-26')
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26')
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26')
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02')
  })

  it('월요일부터 일요일까지 7일', () => {
    expect(weekDates('2026-10-26')).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ])
  })

  it('주 범위 글자: 달이 바뀌면 둘 다, 같은 달이면 끝은 날짜만, 다른 해는 연도도', () => {
    expect(formatWeekRange('2026-10-26', '2026-10-30')).toBe('10월 26일 ~ 11월 1일')
    expect(formatWeekRange('2026-11-02', '2026-10-30')).toBe('11월 2일 ~ 8일')
    expect(formatWeekRange('2026-12-28', '2026-10-30')).toBe('12월 28일 ~ 2027년 1월 3일')
    expect(formatWeekRange('2025-12-29', '2026-10-30')).toBe('2025년 12월 29일 ~ 2026년 1월 4일')
  })

  it('이번 주와의 거리', () => {
    expect(weekOffset('2026-10-26', '2026-10-30')).toBe(0)
    expect(weekOffset('2026-10-19', '2026-10-30')).toBe(-1)
    expect(weekOffset('2026-11-02', '2026-11-01')).toBe(1)
  })
})
