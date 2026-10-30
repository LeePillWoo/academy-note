import { describe, expect, it } from 'vitest'
import { defaultMakeupRule } from './academyRules'
import { buildBlocks, moveSlot, removeSlot, resizeSlot, schedulesWithChange, snapMinutes, timeRange, toMinutes, toTime } from './timetable'
import type { Academy, TimeSlot } from './types'

const monWed: TimeSlot[] = [
  { weekday: 1, start: '17:00', end: '18:30' },
  { weekday: 3, start: '17:00', end: '18:30' },
]

function academy(overrides: Partial<Academy> = {}): Academy {
  return {
    id: 'math',
    childId: 'c1',
    name: '수학학원',
    color: '#6366f1',
    memo: '',
    order: 0,
    startedOn: '2026-09-01',
    schedules: [{ id: 's1', startsOn: '2026-09-01', value: monWed }],
    fees: [{ id: 'f1', startsOn: '2026-09-01', value: { type: 'monthly', amount: 0, dueDay: 1 } }],
    makeupRule: defaultMakeupRule(),
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('시각 계산', () => {
  it('분으로 바꾸고 되돌리기, 10분 단위 맞추기', () => {
    expect(toMinutes('17:30')).toBe(1050)
    expect(toTime(1050)).toBe('17:30')
    expect(toTime(5)).toBe('00:05')
    expect(snapMinutes(1047)).toBe(1050)
    expect(snapMinutes(1044)).toBe(1040)
  })

  it('보여줄 범위: 항상 7시~24시, 더 이른 수업이 있으면 그 정시부터', () => {
    expect(timeRange(buildBlocks([academy()], '2026-10-01'))).toEqual({ startMin: 7 * 60, endMin: 24 * 60 })
    expect(timeRange([])).toEqual({ startMin: 7 * 60, endMin: 24 * 60 })
    const early = buildBlocks([academy({ schedules: [{ id: 's1', startsOn: '2026-09-01', value: [{ weekday: 6, start: '06:30', end: '07:30' }] }] })], '2026-10-01')
    expect(timeRange(early)).toEqual({ startMin: 6 * 60, endMin: 24 * 60 })
  })
})

describe('블록 만들기', () => {
  it('그 날짜에 다니는 학원만, 기간별 일정 반영', () => {
    const changed = academy({
      schedules: [
        { id: 's1', startsOn: '2026-09-01', value: monWed },
        { id: 's2', startsOn: '2026-11-01', value: [{ weekday: 2, start: '16:00', end: '17:00' }] },
      ],
    })
    expect(buildBlocks([changed], '2026-10-15').map((b) => b.weekday)).toEqual([1, 3])
    expect(buildBlocks([changed], '2026-11-15').map((b) => b.weekday)).toEqual([2])
    expect(buildBlocks([academy({ endedOn: '2026-10-10' })], '2026-10-15')).toEqual([])
    expect(buildBlocks([academy()], '2026-08-01')).toEqual([])
  })

  it('편집 중인 시간대(overrides)를 우선', () => {
    const overrides = new Map([['math', [{ weekday: 5, start: '10:00', end: '11:00' } as TimeSlot]]])
    expect(buildBlocks([academy()], '2026-10-01', overrides).map((b) => `${b.weekday} ${b.start}`)).toEqual(['5 10:00'])
  })
})

describe('옮기기', () => {
  it('요일과 시각을 바꾸고 길이는 유지', () => {
    const result = moveSlot(monWed, 1, 2, '18:10')
    expect(result).toEqual({
      slots: [
        { weekday: 2, start: '18:10', end: '19:40' },
        { weekday: 3, start: '17:00', end: '18:30' },
      ],
    })
  })

  it('이미 수업이 있는 요일로는 못 옮김, 하루를 넘겨도 못 옮김', () => {
    expect(moveSlot(monWed, 1, 3, '17:00')).toEqual({ error: '수요일에 이미 이 학원 수업이 있습니다.' })
    expect(moveSlot(monWed, 1, 1, '23:00')).toEqual({ error: '하루를 넘어가는 시각입니다.' })
    // 같은 요일 안에서 시각만 바꾸는 건 됨
    expect('slots' in moveSlot(monWed, 1, 1, '18:00')).toBe(true)
  })
})

describe('길이 바꾸기', () => {
  it('시작·끝 시각을 바꾸고, 너무 짧거나 하루를 넘기면 안 됨', () => {
    expect(resizeSlot(monWed, 1, '17:00', '19:30')).toEqual({
      slots: [
        { weekday: 1, start: '17:00', end: '19:30' },
        { weekday: 3, start: '17:00', end: '18:30' },
      ],
    })
    expect(resizeSlot(monWed, 1, '17:00', '17:10')).toEqual({ error: '수업은 20분보다 길어야 합니다.' })
    expect(resizeSlot(monWed, 1, '23:00', '24:30')).toEqual({ error: '하루를 넘어가는 시각입니다.' })
  })
})

describe('시간표에서 빼기', () => {
  it('한 요일을 빼고, 마지막 하나는 못 뺌', () => {
    expect(removeSlot(monWed, 1)).toEqual({ slots: [{ weekday: 3, start: '17:00', end: '18:30' }] })
    expect(removeSlot([monWed[0]], 1)).toEqual({ error: '마지막 수업은 뺄 수 없습니다. 학원을 그만뒀으면 학원 설정에서 "그만둔 날"을 넣으세요.' })
    expect(removeSlot(monWed, 5)).toEqual({ error: '뺄 수업을 찾지 못했습니다.' })
  })
})

describe('일정에 반영', () => {
  const tue: TimeSlot[] = [{ weekday: 2, start: '17:00', end: '18:30' }]

  it("'current': 적용 중인 기간을 그대로 고침", () => {
    const result = schedulesWithChange(academy(), tue, 'current', '2026-10-15')
    expect(result).toEqual([{ id: 's1', startsOn: '2026-09-01', value: tue }])
  })

  it('날짜: 그날부터 새 기간 추가, 이미 그날 시작하는 기간이 있으면 고침, 시작일 전이면 첫 기간 고침', () => {
    const added = schedulesWithChange(academy(), tue, '2026-11-01', '2026-10-15')
    expect(added).toHaveLength(2)
    expect(added[1]).toMatchObject({ startsOn: '2026-11-01', value: tue })

    const two = academy({ schedules: [...academy().schedules, { id: 's2', startsOn: '2026-11-01', value: monWed }] })
    expect(schedulesWithChange(two, tue, '2026-11-01', '2026-11-15')).toEqual([
      { id: 's1', startsOn: '2026-09-01', value: monWed },
      { id: 's2', startsOn: '2026-11-01', value: tue },
    ])

    expect(schedulesWithChange(academy(), tue, '2026-08-01', '2026-10-15')).toEqual([{ id: 's1', startsOn: '2026-09-01', value: tue }])
  })
})
