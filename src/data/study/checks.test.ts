import { describe, expect, it } from 'vitest'
import { childRemovalChanges } from '../cascade'
import { applyChanges, emptyDatabase } from '../storage'
import type { Database, StudyTask, Subject } from '../types'
import { subjectRemovalChanges, tasksRemovalChanges } from './cascade'
import { checkToggleChanges, studyWeekId } from './checks'

const NOW = '2026-10-31T00:00:00.000Z'
const base = { createdAt: '', updatedAt: '' }
const subject: Subject = { ...base, id: 's1', childId: 'c1', name: '수학', color: '#6366f1', order: 0 }
const other: Subject = { ...base, id: 's2', childId: 'c2', name: '영어', color: '#ec4899', order: 0 }
const task = (id: string, subjectId = 's1'): StudyTask => ({ ...base, id, subjectId, name: id, weekdays: [1, 2, 3, 4, 5], order: 0 })

function setup(): Database {
  return {
    ...emptyDatabase(),
    children: [
      { ...base, id: 'c1', name: '첫째', color: '#6366f1', order: 0 },
      { ...base, id: 'c2', name: '둘째', color: '#ec4899', order: 1 },
    ],
    subjects: [subject, other],
    studyTasks: [task('t1'), task('t2'), task('t3', 's2')],
  }
}

/** 차례로 체크를 눌러 본 데이터 */
function toggle(data: Database, taskId: string, date: string): Database {
  return applyChanges(data, checkToggleChanges(data, taskId, date, NOW))
}

describe('학습 체크 (주 묶음)', () => {
  it('첫 체크는 그 주(월요일 기준) 묶음을 새로 만듦', () => {
    const data = toggle(setup(), 't1', '2026-10-30')
    expect(data.studyWeeks).toEqual([
      { id: studyWeekId('c1', '2026-10-26'), childId: 'c1', weekStart: '2026-10-26', done: ['t1:2026-10-30'], createdAt: NOW, updatedAt: NOW },
    ])
  })

  it('같은 주의 다른 칸은 같은 묶음에 더하고, 다시 누르면 빼고, 비면 묶음을 지움', () => {
    let data = toggle(setup(), 't1', '2026-10-26')
    data = toggle(data, 't2', '2026-11-01') // 일요일도 같은 주
    expect(data.studyWeeks).toHaveLength(1)
    expect(data.studyWeeks[0].done).toEqual(['t1:2026-10-26', 't2:2026-11-01'])
    data = toggle(data, 't1', '2026-10-26')
    expect(data.studyWeeks[0].done).toEqual(['t2:2026-11-01'])
    data = toggle(data, 't2', '2026-11-01')
    expect(data.studyWeeks).toEqual([])
  })

  it('다음 주와 다른 자녀는 다른 묶음', () => {
    let data = toggle(setup(), 't1', '2026-11-01')
    data = toggle(data, 't1', '2026-11-02')
    data = toggle(data, 't3', '2026-11-02')
    expect(data.studyWeeks.map((week) => week.id).sort()).toEqual(['c1:2026-10-26', 'c1:2026-11-02', 'c2:2026-11-02'])
  })

  it('없는 학습 내용은 아무것도 바꾸지 않음', () => {
    expect(checkToggleChanges(setup(), 'none', '2026-10-30', NOW)).toEqual([])
  })
})

describe('학습 기록 함께 지우기', () => {
  function checked(): Database {
    let data = toggle(setup(), 't1', '2026-10-26')
    data = toggle(data, 't2', '2026-10-27')
    data = toggle(data, 't1', '2026-11-02')
    return toggle(data, 't3', '2026-10-26')
  }

  it('학습 내용 두 개를 한 번에 지우면 같은 주 묶음을 한 번만 고쳐 씀', () => {
    const data = checked()
    const changes = tasksRemovalChanges(data, ['t1', 't2'], NOW)
    const weekChanges = changes.filter((change) => change.collection === 'studyWeeks')
    expect(weekChanges.map((change) => change.type)).toEqual(['remove', 'remove'])
    const next = applyChanges(data, changes)
    expect(next.studyTasks.map((item) => item.id)).toEqual(['t3'])
    expect(next.studyWeeks.map((week) => week.id)).toEqual(['c2:2026-10-26'])
  })

  it('한 내용만 지우면 같은 주의 다른 체크는 남김', () => {
    const next = applyChanges(checked(), tasksRemovalChanges(checked(), ['t2'], NOW))
    expect(next.studyWeeks.find((week) => week.id === 'c1:2026-10-26')?.done).toEqual(['t1:2026-10-26'])
  })

  it('과목을 지우면 학습 내용과 체크도', () => {
    const next = applyChanges(checked(), subjectRemovalChanges(checked(), 's1', NOW))
    expect(next.subjects.map((item) => item.id)).toEqual(['s2'])
    expect(next.studyTasks.map((item) => item.id)).toEqual(['t3'])
    expect(next.studyWeeks.map((week) => week.childId)).toEqual(['c2'])
  })

  it('자녀를 지우면 그 자녀의 과목, 학습 내용, 주 묶음도 (다른 자녀는 그대로)', () => {
    const next = applyChanges(checked(), childRemovalChanges(checked(), 'c1'))
    expect(next.children.map((item) => item.id)).toEqual(['c2'])
    expect(next.subjects.map((item) => item.id)).toEqual(['s2'])
    expect(next.studyTasks.map((item) => item.id)).toEqual(['t3'])
    expect(next.studyWeeks.map((week) => week.id)).toEqual(['c2:2026-10-26'])
  })
})
