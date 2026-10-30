import { describe, expect, it } from 'vitest'
import { defaultMakeupRule } from './academyRules'
import { buildLessonViews, plannedLessons } from './lessonPlan'
import type { Academy, Lesson } from './types'

function academy(overrides: Partial<Academy> = {}): Academy {
  return {
    id: 'math',
    childId: 'c1',
    name: '수학학원',
    color: '#3b82f6',
    memo: '',
    order: 0,
    startedOn: '2026-10-01',
    // 월·수 17:00~18:00, 11월부터는 화요일만
    schedules: [
      { id: 's1', startsOn: '2026-10-01', value: [{ weekday: 1, start: '17:00', end: '18:00' }, { weekday: 3, start: '17:00', end: '18:00' }] },
      { id: 's2', startsOn: '2026-11-01', value: [{ weekday: 2, start: '16:00', end: '17:00' }] },
    ],
    fees: [{ id: 'f1', startsOn: '2026-10-01', value: { type: 'monthly', amount: 250_000, dueDay: 5 } }],
    makeupRule: defaultMakeupRule(),
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function record(date: string, status: Lesson['status'], id = date): Lesson {
  return { id, academyId: 'math', date, status, memo: '', createdAt: '', updatedAt: '' }
}

describe('수업일 계산', () => {
  it('요일에 맞는 날만, 일정이 바뀌면 그날부터 새 일정', () => {
    // 2026-10-26(월), 10-28(수), 11-03(화)
    const dates = plannedLessons(academy(), '2026-10-26', '2026-11-04').map((l) => `${l.date} ${l.start}`)
    expect(dates).toEqual(['2026-10-26 17:00', '2026-10-28 17:00', '2026-11-03 16:00'])
  })

  it('수강 시작일 전과 그만둔 날 뒤는 빼기', () => {
    const lessons = plannedLessons(academy({ startedOn: '2026-10-07', endedOn: '2026-10-14' }), '2026-10-01', '2026-10-31')
    expect(lessons.map((l) => l.date)).toEqual(['2026-10-07', '2026-10-12', '2026-10-14'])
  })
})

describe('수업 목록', () => {
  it('기록이 없으면 지난 수업은 출석(자동), 오늘과 앞으로는 예정', () => {
    const views = buildLessonViews([academy()], [], '2026-10-26', '2026-10-28', '2026-10-28')
    expect(views.map((v) => [v.date, v.status, v.assumed])).toEqual([
      ['2026-10-26', 'attended', true],
      ['2026-10-28', 'planned', false],
    ])
  })

  it('기록이 있으면 기록대로, 일정에 없는 날의 기록도 보여줌', () => {
    const views = buildLessonViews(
      [academy()],
      [record('2026-10-26', 'absent'), record('2026-10-27', 'attended'), record('2026-10-28', 'makeup', 'm1')],
      '2026-10-26',
      '2026-10-28',
      '2026-10-30',
    )
    expect(views.map((v) => [v.date, v.status, v.planned])).toEqual([
      ['2026-10-26', 'absent', true],
      ['2026-10-27', 'attended', false],
      // 수요일 정규 수업과 같은 날의 보강 출석은 따로 보임
      ['2026-10-28', 'attended', true],
      ['2026-10-28', 'makeup', false],
    ])
  })
})
