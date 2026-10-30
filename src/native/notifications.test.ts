import { describe, expect, it } from 'vitest'
import type { ScheduledNotification } from '../data/notifications'
import { notificationId, pickUpcoming, toDateTime } from './notifications'

const item = (id: string, date: string, time: string): ScheduledNotification => ({
  id,
  kind: 'paymentOverdue',
  date,
  time,
  title: 't',
  body: 'b',
  link: '/payments',
  academyId: 'a',
})

describe('폰 알림 예약 준비', () => {
  it('글자 id → 늘 같은 양의 정수', () => {
    expect(notificationId('overdue|a1|m|2026-11|2026-11-06')).toBe(notificationId('overdue|a1|m|2026-11|2026-11-06'))
    expect(notificationId('x')).toBeGreaterThan(0)
    expect(notificationId('x')).not.toBe(notificationId('y'))
  })

  it('날짜+시각은 기기 시간대 기준', () => {
    const at = toDateTime('2026-11-06', '09:00')
    expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()]).toEqual([2026, 10, 6, 9, 0])
  })

  it('지난 것은 빼고 가까운 순서로 최대 개수까지, id가 겹치면 바꿈', () => {
    const now = new Date(2026, 10, 6, 10, 0)
    const list = [item('c', '2026-11-08', '09:00'), item('a', '2026-11-06', '09:00'), item('b', '2026-11-06', '20:00'), item('d', '2026-11-07', '09:00')]
    const picked = pickUpcoming(list, now, 2)
    expect(picked.map((p) => p.item.id)).toEqual(['b', 'd'])
    const ids = pickUpcoming(list, now).map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
