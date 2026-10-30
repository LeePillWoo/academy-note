import { describe, expect, it } from 'vitest'
import { defaultMakeupRule } from './academyRules'
import { defaultRule, effectiveRules, scheduledNotifications } from './notifications'
import { emptyDatabase } from './storage'
import type { Academy, Database, Makeup, NotificationKind, NotificationRule } from './types'

/** 월·수 17:00 수업, 매월 5일 25만 원. 10월 1일부터 다녔고 앱에는 11월 1일에 등록 */
const academy: Academy = {
  id: 'a1',
  childId: 'c1',
  name: '수학학원',
  color: '#6366f1',
  memo: '',
  order: 0,
  startedOn: '2026-10-01',
  schedules: [{ id: 's1', startsOn: '2026-10-01', value: [{ weekday: 1, start: '17:00', end: '18:00' }, { weekday: 3, start: '17:00', end: '18:00' }] }],
  fees: [{ id: 'f1', startsOn: '2026-10-01', value: { type: 'monthly', amount: 250_000, dueDay: 5 } }],
  makeupRule: defaultMakeupRule(),
  createdAt: '2026-11-01T01:00:00.000Z',
  updatedAt: '',
}

function db(overrides: Partial<Database> = {}): Database {
  return { ...emptyDatabase(), academies: [academy], children: [{ id: 'c1', name: '첫째', color: '#000', order: 0, createdAt: '', updatedAt: '' }], ...overrides }
}

function rules(overrides: Partial<Record<NotificationKind, Partial<NotificationRule>>> = {}) {
  const base = effectiveRules([])
  for (const [kind, patch] of Object.entries(overrides)) base[kind as NotificationKind] = { ...base[kind as NotificationKind], ...patch }
  return base
}

const schedule = (data: Database, from: string, days: number, r = rules()) =>
  scheduledNotifications({ data, rules: r, from, days, feeContext: { lessons: data.lessons, makeups: data.makeups, todayStr: from } })

describe('기본 알림 설정', () => {
  it('미납은 매일 켜짐, 등원은 꺼짐, 저장된 것이 있으면 그것을 씀', () => {
    expect(defaultRule('paymentOverdue')).toMatchObject({ enabled: true, timings: [{ before: 1, time: '09:00' }] })
    expect(defaultRule('lesson').enabled).toBe(false)
    const stored: NotificationRule = { ...defaultRule('lesson'), enabled: true, createdAt: 'x', updatedAt: 'x' }
    expect(effectiveRules([stored]).lesson.enabled).toBe(true)
    expect(effectiveRules([stored]).paymentOverdue.enabled).toBe(true)
  })
})

describe('예정된 알림', () => {
  it('미납: 납부일 다음날부터 매일, 체크(납부)하면 없음. 앱 등록 전 항목은 알리지 않음', () => {
    // 11-05 납부일, 오늘 11-08 → 11-08부터 매일 (10-05분은 등록 전이라 낸 것으로 봄)
    const list = schedule(db(), '2026-11-08', 4)
    expect(list.map((n) => [n.date, n.time, n.kind])).toEqual([
      ['2026-11-08', '09:00', 'paymentOverdue'],
      ['2026-11-09', '09:00', 'paymentOverdue'],
      ['2026-11-10', '09:00', 'paymentOverdue'],
      ['2026-11-11', '09:00', 'paymentOverdue'],
    ])
    expect(list[0].title).toBe('수학학원 학원비 미납')
    expect(list[0].body).toContain('11월분 25만 원 · 납부일 11월 5일 (목)에서 3일 지남')

    const paid = db({
      payments: [{ id: 'p1', academyId: 'a1', kind: 'tuition', dueKey: 'a1|m|2026-11', title: '11월분', dueOn: '2026-11-05', amount: 250_000, paidOn: '2026-11-06', memo: '', createdAt: '', updatedAt: '' }],
    })
    expect(schedule(paid, '2026-11-08', 4)).toEqual([])
  })

  it('납부일 알림은 켜면 며칠 전에, 미납 알림은 납부일 당일에는 안 울림', () => {
    const r = rules({ paymentDue: { enabled: true, timings: [{ id: 't', before: 1, time: '08:00' }] } })
    // 11월분은 냈고 12월분(12-05)만 남은 상태
    const novPaid = db({
      payments: [{ id: 'p1', academyId: 'a1', kind: 'tuition', dueKey: 'a1|m|2026-11', title: '11월분', dueOn: '2026-11-05', amount: 250_000, paidOn: '2026-11-05', memo: '', createdAt: '', updatedAt: '' }],
    })
    const list = schedule(novPaid, '2026-12-01', 10, r)
    expect(list.map((n) => [n.date, n.time, n.kind])).toEqual([
      ['2026-12-04', '08:00', 'paymentDue'],
      ['2026-12-06', '09:00', 'paymentOverdue'],
      ['2026-12-07', '09:00', 'paymentOverdue'],
      ['2026-12-08', '09:00', 'paymentOverdue'],
      ['2026-12-09', '09:00', 'paymentOverdue'],
      ['2026-12-10', '09:00', 'paymentOverdue'],
    ])
    // 미납 알림을 끄면 납부일 알림만
    expect(schedule(novPaid, '2026-12-01', 10, rules({ paymentDue: r.paymentDue, paymentOverdue: { enabled: false } })).map((n) => n.kind)).toEqual(['paymentDue'])
  })

  it('보강: 예정은 전날 20시, 미정은 기한 3일 전 9시', () => {
    const scheduled: Makeup = { id: 'm1', academyId: 'a1', lessonId: 'l1', missedOn: '2026-11-02', reason: 'absent', deadline: '2026-11-16', scheduledOn: '2026-11-10', start: '10:00', end: '11:00', status: 'open', memo: '', createdAt: '', updatedAt: '' }
    const pending: Makeup = { ...scheduled, id: 'm2', lessonId: 'l2', scheduledOn: undefined, start: undefined, end: undefined }
    const list = schedule(db({ makeups: [scheduled, pending], payments: [] }), '2026-11-06', 10, rules({ paymentOverdue: { enabled: false } }))
    expect(list.map((n) => [n.date, n.time, n.kind, n.title])).toEqual([
      ['2026-11-09', '20:00', 'makeupScheduled', '수학학원 보강 내일'],
      ['2026-11-13', '09:00', 'makeupDeadline', '수학학원 보강 마감 3일 전'],
    ])
  })

  it('등원 알림은 켰을 때만, 수업 시작 몇 분 전 (자정을 넘기면 전날)', () => {
    const quiet = rules({ paymentOverdue: { enabled: false } })
    expect(schedule(db(), '2026-11-09', 3, quiet)).toEqual([])
    const on = rules({ paymentOverdue: { enabled: false }, lesson: { enabled: true, timings: [{ id: 't', before: 30, time: '00:00' }] } })
    // 11-09(월), 11-11(수) 수업 17:00 → 16:30
    expect(schedule(db(), '2026-11-09', 3, on).map((n) => [n.date, n.time, n.title])).toEqual([
      ['2026-11-09', '16:30', '수학학원 수업 30분 전'],
      ['2026-11-11', '16:30', '수학학원 수업 30분 전'],
    ])
  })
})
