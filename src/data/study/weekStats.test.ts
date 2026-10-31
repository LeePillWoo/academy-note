import { describe, expect, it } from 'vitest'
import { weekDates } from '../../utils/week'
import type { StudyTask } from '../types'
import { cellState, dayItems, percent, progressOf } from './weekStats'

// 평일(월~금)에 계획한 학습 내용
const task: StudyTask = { id: 't1', subjectId: 's1', name: '연산 10분', weekdays: [1, 2, 3, 4, 5], order: 0, createdAt: '', updatedAt: '' }
const TODAY = '2026-10-30' // 금요일

describe('칸 상태', () => {
  it('계획한 요일이 지났는데 체크가 없으면 놓침', () => {
    expect(cellState(task, '2026-10-26', false, TODAY)).toEqual({ planned: true, done: false, missed: true })
  })

  it('오늘은 아직 놓침이 아님', () => {
    expect(cellState(task, TODAY, false, TODAY)).toEqual({ planned: true, done: false, missed: false })
  })

  it('계획하지 않은 요일(토)은 지났어도 놓침이 아님', () => {
    expect(cellState(task, '2026-10-24', false, TODAY)).toEqual({ planned: false, done: false, missed: false })
  })

  it('체크하면 놓침이 풀림', () => {
    expect(cellState(task, '2026-10-26', true, TODAY)).toEqual({ planned: true, done: true, missed: false })
  })
})

describe('계획표 칸에 보일 학습 내용', () => {
  // 독서는 토·일만 계획
  const weekend: StudyTask = { ...task, id: 't2', name: '독서', weekdays: [6, 0], order: 1 }

  it('그날 계획한 것만, 순서대로', () => {
    expect(dayItems([task, weekend], '2026-10-26', () => false).map((t) => t.id)).toEqual(['t1'])
    expect(dayItems([task, weekend], '2026-10-31', () => false).map((t) => t.id)).toEqual(['t2'])
  })

  it('계획에 없어도 그날 체크했으면 보임', () => {
    const done = (taskId: string, date: string) => taskId === 't2' && date === '2026-10-26'
    expect(dayItems([task, weekend], '2026-10-26', done).map((t) => t.id)).toEqual(['t1', 't2'])
  })
})

describe('진행 세기', () => {
  const dates = weekDates('2026-10-26')

  it('계획 칸 수와 완료 칸 수. 계획하지 않은 날에 한 것도 완료로 셈', () => {
    const done = new Set(['2026-10-26', '2026-10-31'])
    const progress = progressOf([task], dates, (_, date) => done.has(date))
    expect(progress).toEqual({ done: 2, planned: 5 })
    expect(percent(progress)).toBe(40)
  })

  it('계획보다 많이 해도 100%를 넘지 않음', () => {
    expect(percent({ done: 7, planned: 5 })).toBe(100)
  })

  it('계획이 없으면 0%, 그래도 했으면 100%', () => {
    expect(percent({ done: 0, planned: 0 })).toBe(0)
    expect(percent({ done: 1, planned: 0 })).toBe(100)
  })
})
