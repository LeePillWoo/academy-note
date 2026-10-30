import { useData } from './DataProvider'
import { newId, nowIso } from './id'
import { withoutSchedule } from './makeupChanges'
import type { Lesson, Makeup } from './types'
import type { DateStr, TimeStr } from '../utils/date'

export interface MakeupTime {
  date: DateStr
  start: TimeStr
  end: TimeStr
}

/** 보강 목록과 보강을 바꾸는 기능 */
export function useMakeups() {
  const { data, apply } = useData()

  async function put(item: Makeup) {
    await apply([{ type: 'put', collection: 'makeups', item }])
  }

  /** 보강 날짜를 잡거나 바꿉니다. (예정) */
  async function scheduleMakeup(makeup: Makeup, time: MakeupTime, memo: string) {
    await put({ ...makeup, scheduledOn: time.date, start: time.start, end: time.end, memo, updatedAt: nowIso() })
  }

  /** 예정을 취소합니다. (미정으로) */
  async function unscheduleMakeup(makeup: Makeup) {
    await put({ ...withoutSchedule(makeup), updatedAt: nowIso() })
  }

  /** 다녀왔다고 기록합니다. 그날 달력에 보강 출석이 생깁니다. */
  async function completeMakeup(makeup: Makeup, time: MakeupTime, memo: string) {
    const now = nowIso()
    const lesson: Lesson = {
      id: makeup.doneLessonId ?? newId(),
      academyId: makeup.academyId,
      date: time.date,
      start: time.start,
      end: time.end,
      status: 'makeup',
      memo: '',
      makeupId: makeup.id,
      createdAt: now,
      updatedAt: now,
    }
    await apply([
      { type: 'put', collection: 'lessons', item: lesson },
      {
        type: 'put',
        collection: 'makeups',
        item: { ...makeup, status: 'done', scheduledOn: time.date, start: time.start, end: time.end, doneLessonId: lesson.id, memo, updatedAt: now },
      },
    ])
  }

  /** 완료를 취소합니다. 보강 출석 기록을 지우고 예정으로 되돌립니다. */
  async function uncompleteMakeup(makeup: Makeup) {
    const { doneLessonId: _doneLessonId, ...rest } = makeup
    await apply([
      ...(makeup.doneLessonId ? [{ type: 'remove' as const, collection: 'lessons' as const, id: makeup.doneLessonId }] : []),
      { type: 'put', collection: 'makeups', item: { ...rest, status: 'open', updatedAt: nowIso() } },
    ])
  }

  /** 보강을 하지 않기로 합니다. */
  async function skipMakeup(makeup: Makeup, memo: string) {
    await put({ ...withoutSchedule(makeup), status: 'skipped', memo, updatedAt: nowIso() })
  }

  /** '보강 안 함'을 되돌립니다. (미정으로) */
  async function reopenMakeup(makeup: Makeup) {
    await put({ ...makeup, status: 'open', updatedAt: nowIso() })
  }

  return {
    makeups: data.makeups,
    scheduleMakeup,
    unscheduleMakeup,
    completeMakeup,
    uncompleteMakeup,
    skipMakeup,
    reopenMakeup,
  }
}
