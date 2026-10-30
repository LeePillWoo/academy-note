import { describe, expect, it } from 'vitest'
import { defaultMakeupRule } from './academyRules'
import { makeupSyncChanges } from './makeupChanges'
import { describeDeadline, makeupDeadline, makeupState, scheduleWarnings } from './makeupRules'
import { emptyDatabase } from './storage'
import type { Academy, Database, Lesson, Makeup, MakeupRule } from './types'

function academy(rule: Partial<MakeupRule> = {}): Academy {
  return {
    id: 'math',
    childId: 'c1',
    name: '수학학원',
    color: '#3b82f6',
    memo: '',
    order: 0,
    startedOn: '2026-10-01',
    schedules: [{ id: 's1', startsOn: '2026-10-01', value: [{ weekday: 1, start: '17:00', end: '18:00' }] }],
    fees: [{ id: 'f1', startsOn: '2026-10-01', value: { type: 'monthly', amount: 250_000, dueDay: 5 } }],
    makeupRule: { ...defaultMakeupRule(), ...rule },
    createdAt: '',
    updatedAt: '',
  }
}

function makeup(overrides: Partial<Makeup> = {}): Makeup {
  return {
    id: 'm1',
    academyId: 'math',
    lessonId: 'l1',
    missedOn: '2026-10-26',
    reason: 'absent',
    deadline: '2026-11-09',
    status: 'open',
    memo: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function lesson(status: Lesson['status']): Lesson {
  return { id: 'l1', academyId: 'math', date: '2026-10-26', status, memo: '', createdAt: '', updatedAt: '' }
}

function db(overrides: Partial<Database> = {}): Database {
  return { ...emptyDatabase(), academies: [academy()], ...overrides }
}

describe('보강 기한', () => {
  it('규칙마다 기한 계산', () => {
    const rule = defaultMakeupRule()
    expect(makeupDeadline({ ...rule, window: { type: 'days', days: 14 } }, '2026-10-26')).toBe('2026-11-09')
    expect(makeupDeadline({ ...rule, window: { type: 'sameMonth' } }, '2026-10-26')).toBe('2026-10-31')
    expect(makeupDeadline({ ...rule, window: { type: 'nextMonthEnd' } }, '2026-01-31')).toBe('2026-02-28')
    expect(makeupDeadline({ ...rule, window: { type: 'none' } }, '2026-10-26')).toBeUndefined()
  })

  it('기한 글', () => {
    expect(describeDeadline('2026-11-09', '2026-10-30')).toBe('11월 9일 (월)까지 · 10일 남음')
    expect(describeDeadline('2026-10-30', '2026-10-30')).toBe('오늘까지')
    expect(describeDeadline(undefined, '2026-10-30')).toBe('기한 없음')
  })
})

describe('보강 상태', () => {
  it('미정 → 예정 → 완료, 날짜를 안 잡고 기한이 지나면 기한 만료', () => {
    expect(makeupState(makeup(), '2026-10-30')).toBe('pending')
    expect(makeupState(makeup(), '2026-11-10')).toBe('expired')
    expect(makeupState(makeup({ scheduledOn: '2026-11-02' }), '2026-11-10')).toBe('scheduled')
    expect(makeupState(makeup({ status: 'done', scheduledOn: '2026-11-02' }), '2026-11-10')).toBe('done')
    expect(makeupState(makeup({ status: 'skipped' }), '2026-10-30')).toBe('skipped')
  })
})

describe('보강 날짜 검사', () => {
  it('기한, 가능 요일과 시간, 한 달 횟수', () => {
    const rule: Partial<MakeupRule> = { slots: [{ weekday: 6, start: '10:00', end: '12:00' }], monthlyLimit: 1 }
    const target = makeup()
    const other = makeup({ id: 'm2', lessonId: 'l2', scheduledOn: '2026-11-07' })

    // 11-07(토) 10:00~11:00: 같은 달에 이미 1회 → 횟수 경고만
    expect(scheduleWarnings({ makeup: target, academy: academy(rule), makeups: [target, other], date: '2026-11-07', start: '10:00', end: '11:00' }))
      .toEqual(['이 달 보강이 이미 1회입니다. (한 달 최대 1회)'])

    // 11-10(화): 기한 지남, 토요일 아님
    expect(scheduleWarnings({ makeup: target, academy: academy(rule), makeups: [target], date: '2026-11-10' })).toEqual([
      '보강 기한(11월 9일 (월))이 지난 날짜입니다.',
      '보강 가능 요일이 아닙니다. (가능: 토 10:00~12:00)',
    ])

    // 토요일이지만 시간이 벗어남
    expect(scheduleWarnings({ makeup: target, academy: academy(rule), makeups: [target], date: '2026-10-31', start: '13:00', end: '14:00' }))
      .toEqual(['보강 가능 시간(10:00~12:00)을 벗어납니다.'])
  })
})

describe('수업 기록에 따라 보강 맞추기', () => {
  it('결석을 기록하면 보강이 생기고 기한이 계산됨', () => {
    const changes = makeupSyncChanges(db(), 'l1', lesson('absent'), 'now')
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ type: 'put', collection: 'makeups', item: { lessonId: 'l1', reason: 'absent', deadline: '2026-11-09', status: 'open' } })
  })

  it('휴강은 보강하지 않는 학원이면 보강이 생기지 않음', () => {
    const data = db({ academies: [academy({ forCancellation: false })] })
    expect(makeupSyncChanges(data, 'l1', lesson('cancelled'), 'now')).toEqual([])
  })

  it('결석 → 휴강이면 이유만 바뀜', () => {
    const changes = makeupSyncChanges(db({ makeups: [makeup()] }), 'l1', lesson('cancelled'), 'now')
    expect(changes).toEqual([{ type: 'put', collection: 'makeups', item: { ...makeup(), reason: 'cancelled', updatedAt: 'now' } }])
  })

  it('출석으로 바꾸거나 기록을 지우면 보강과 보강 출석 기록이 지워짐', () => {
    const done = makeup({ status: 'done', doneLessonId: 'l9' })
    const expected = [
      { type: 'remove', collection: 'makeups', id: 'm1' },
      { type: 'remove', collection: 'lessons', id: 'l9' },
    ]
    expect(makeupSyncChanges(db({ makeups: [done] }), 'l1', lesson('attended'), 'now')).toEqual(expected)
    expect(makeupSyncChanges(db({ makeups: [done] }), 'l1', null, 'now')).toEqual(expected)
  })
})
