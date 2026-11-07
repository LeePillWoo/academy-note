import { describe, expect, it } from 'vitest'
import { defaultMakeupRule } from './academyRules'
import { createBackup, parseBackup, serializeBackup } from './backup'
import { makeupSyncChanges } from './makeupChanges'
import { effectiveRules, scheduledNotifications } from './notifications'
import { plannedDues, sessionProgress, type FeeContext } from './paymentPlan'
import { applyChanges, emptyDatabase } from './storage'
import type { Academy, Database, Lesson } from './types'

/**
 * 실사용 시나리오 시뮬레이션. 화면이 하는 일(기록 + 보강 동기화)을 데이터 계층에서 그대로 따라 하며,
 * "사용자가 실제로 하는 순서"에서 계산이 어긋나지 않는지 봅니다. (회차 2/12 버그의 재발 방지 차원)
 */

const NOW = '2026-11-09T09:00:00+09:00'
const base = { memo: '', createdAt: NOW, updatedAt: NOW }

/** 월·수·금 수업, 4회마다 20만 원(결석은 세지 않음), 11-02(월)에 시작하며 바로 등록 */
function mwfAcademy(): Academy {
  return {
    id: 'a1',
    childId: 'c1',
    name: '수학학원',
    color: '#6366f1',
    ...base,
    // 시작한 날 바로 등록 (회차는 등록한 날부터 세므로, 등록이 늦으면 '이미 들은 회차'로 맞춥니다)
    createdAt: '2026-11-02T09:00:00+09:00',
    order: 0,
    startedOn: '2026-11-02',
    schedules: [{ id: 's1', startsOn: '2026-11-02', value: [1, 3, 5].map((weekday) => ({ weekday: weekday as 1 | 3 | 5, start: '16:00', end: '17:00' })) }],
    fees: [{ id: 'f1', startsOn: '2026-11-02', value: { type: 'sessions', amount: 200_000, sessionCount: 4, absenceCounting: 'never', usedAtStart: 0 } }],
    makeupRule: defaultMakeupRule(),
  }
}

function db(academy: Academy): Database {
  return { ...emptyDatabase(), children: [{ id: 'c1', name: '첫째', color: '#6366f1', order: 0, ...base }], academies: [academy] }
}

/** 화면의 출석 기록과 같은 일: 기록 저장 + 보강 동기화 */
function record(data: Database, lesson: Lesson): Database {
  return applyChanges(data, [{ type: 'put', collection: 'lessons', item: lesson }, ...makeupSyncChanges(data, lesson.id, lesson, NOW)])
}

const feeContext = (data: Database, todayStr: string): FeeContext => ({ lessons: data.lessons, makeups: data.makeups, todayStr })

describe('시나리오: 결석 → 보강 → "사실 출석이었음" 정정', () => {
  const absent: Lesson = { id: 'l1', academyId: 'a1', date: '2026-11-04', status: 'absent', ...base }

  it('어느 단계에서도 회차가 이중으로 늘지 않음', () => {
    const today = '2026-11-09' // 월요일 (오늘 수업은 기록 전이라 세지 않음)
    // ① 11-04(수) 결석 기록 → 보강이 자동으로 생김
    let data = record(db(mwfAcademy()), absent)
    expect(data.makeups).toHaveLength(1)
    expect(data.makeups[0]).toMatchObject({ lessonId: 'l1', reason: 'absent', status: 'open' })
    // 들은 수업: 11-02, 11-06 = 2회 (결석은 세지 않음)
    expect(sessionProgress(mwfAcademy(), feeContext(data, today))?.used).toBe(2)

    // ② 11-07(토) 보강을 다녀옴 → 3회
    const makeup = data.makeups[0]
    const makeupLesson: Lesson = { id: 'l-mk', academyId: 'a1', date: '2026-11-07', status: 'makeup', makeupId: makeup.id, ...base }
    data = applyChanges(data, [
      { type: 'put', collection: 'lessons', item: makeupLesson },
      { type: 'put', collection: 'makeups', item: { ...makeup, status: 'done', scheduledOn: '2026-11-07', doneLessonId: 'l-mk' } },
    ])
    expect(sessionProgress(mwfAcademy(), feeContext(data, today))?.used).toBe(3)

    // ③ 알고 보니 출석이었음 → 결석을 출석으로 정정하면 보강과 보강 출석 기록이 함께 지워짐
    data = record(data, { ...absent, status: 'attended' })
    expect(data.makeups).toHaveLength(0)
    expect(data.lessons.map((lesson) => lesson.id).sort()).toEqual(['l1'])
    // 11-02, 11-04, 11-06 = 3회 (보강으로 들은 1회가 남아 4회가 되면 이중)
    expect(sessionProgress(mwfAcademy(), feeContext(data, today))?.used).toBe(3)
  })

  it("'결석도 셈'에서도 왕복 결과가 같음", () => {
    const always = mwfAcademy()
    always.fees[0].value = { type: 'sessions', amount: 200_000, sessionCount: 4, absenceCounting: 'always', usedAtStart: 0 }
    const today = '2026-11-09'
    let data = record(db(always), absent)
    expect(sessionProgress(always, feeContext(data, today))?.used).toBe(3) // 결석도 소진
    const makeup = data.makeups[0]
    data = applyChanges(data, [
      { type: 'put', collection: 'lessons', item: { id: 'l-mk', academyId: 'a1', date: '2026-11-07', status: 'makeup', makeupId: makeup.id, ...base } },
      { type: 'put', collection: 'makeups', item: { ...makeup, status: 'done', doneLessonId: 'l-mk' } },
    ])
    // 결석 때 이미 셌으니 보강을 다녀와도 3회 그대로
    expect(sessionProgress(always, feeContext(data, today))?.used).toBe(3)
    data = record(data, { ...absent, status: 'attended' })
    expect(sessionProgress(always, feeContext(data, today))?.used).toBe(3)
  })
})

describe('시나리오: 학원을 그만둠', () => {
  it('그만둔 날 뒤로는 납부 항목과 다음 납부일이 생기지 않음', () => {
    const quit: Academy = { ...mwfAcademy(), endedOn: '2026-11-14' }
    const data = db(quit)
    const context = feeContext(data, '2026-11-20')
    // 수업: 11-02, 04, 06, 09, 11, 13 … → 회차 납부일: 11-02(첫 묶음), 11-11(5번째 수업, 그만둔 날 전). 그 뒤는 없음
    expect(plannedDues(quit, '2026-12-31', context).map((due) => due.dueOn)).toEqual(['2026-11-02', '2026-11-11'])
    expect(sessionProgress(quit, context)?.nextDueOn).toBeUndefined()

    const monthly: Academy = {
      ...mwfAcademy(),
      id: 'a2',
      name: '피아노',
      startedOn: '2026-10-01',
      createdAt: '2026-10-01T09:00:00+09:00',
      endedOn: '2026-11-15',
      schedules: [{ id: 's1', startsOn: '2026-10-01', value: [{ weekday: 2, start: '16:00', end: '17:00' }] }],
      fees: [{ id: 'f1', startsOn: '2026-10-01', value: { type: 'monthly', amount: 150_000, dueDay: 20 } }],
    }
    // 10-20분만 생기고, 그만둔 날(11-15) 뒤의 11-20분은 없음
    expect(plannedDues(monthly, '2026-12-31', context).map((due) => due.dueOn)).toEqual(['2026-10-20'])
  })
})

describe('시나리오: 자동납부 학원은 미납 알림이 없음', () => {
  it('직접 체크하는 학원만 미납 알림을 만듦', () => {
    const auto: Academy = {
      ...mwfAcademy(),
      id: 'a-auto',
      name: '미술학원',
      autoPayment: true,
      startedOn: '2026-10-01',
      createdAt: '2026-10-01T09:00:00+09:00',
      fees: [{ id: 'f1', startsOn: '2026-10-01', value: { type: 'monthly', amount: 150_000, dueDay: 4 } }],
    }
    const manual: Academy = {
      ...auto,
      id: 'a-man',
      name: '수학학원',
      autoPayment: false,
    }
    const data: Database = { ...db(auto), academies: [auto, manual] }
    const list = scheduledNotifications({
      data,
      rules: effectiveRules([]),
      from: '2026-11-20',
      days: 7,
      feeContext: feeContext(data, '2026-11-20'),
    })
    const overdue = list.filter((item) => item.kind === 'paymentOverdue')
    expect(overdue.length).toBeGreaterThan(0)
    expect(overdue.every((item) => item.academyId === 'a-man')).toBe(true)
  })
})

describe('시나리오: 백업 왕복', () => {
  it('자동납부 설정과 학습 기록(주 묶음)까지 그대로 돌아옴', () => {
    const academy: Academy = { ...mwfAcademy(), autoPayment: true }
    const full: Database = {
      ...db(academy),
      lessons: [{ id: 'l1', academyId: 'a1', date: '2026-11-04', status: 'absent', ...base }],
      makeups: [{ id: 'm1', academyId: 'a1', lessonId: 'l1', missedOn: '2026-11-04', reason: 'absent', status: 'open', ...base }],
      payments: [{ id: 'p1', academyId: 'a1', kind: 'tuition', dueKey: 'a1|s|f1|0', title: '4회분', dueOn: '2026-11-02', amount: 200_000, paidOn: '2026-11-02', method: 'transfer', ...base }],
      notificationRules: [{ id: 'paymentDue', kind: 'paymentDue', enabled: true, timings: [{ id: 't', before: 1, time: '09:00' }], createdAt: NOW, updatedAt: NOW }],
      subjects: [{ id: 'sb1', childId: 'c1', name: '수학', color: '#6366f1', order: 0, createdAt: NOW, updatedAt: NOW }],
      studyTasks: [{ id: 't1', subjectId: 'sb1', name: '문제집', weekdays: [1, 2, 3, 4, 5], order: 0, createdAt: NOW, updatedAt: NOW }],
      studyWeeks: [{ id: 'c1:2026-11-02', childId: 'c1', weekStart: '2026-11-02', done: ['t1:2026-11-03'], createdAt: NOW, updatedAt: NOW }],
    }
    const result = parseBackup(serializeBackup(createBackup(full)))
    expect('backup' in result).toBe(true)
    if ('backup' in result) {
      expect(result.backup.data).toEqual(full)
      expect(result.backup.data.academies[0].autoPayment).toBe(true)
    }
  })
})
