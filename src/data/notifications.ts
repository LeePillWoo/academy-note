import { addDays, daysBetween, formatDate, type DateStr, type TimeStr } from '../utils/date'
import { formatFee } from '../utils/money'
import { buildLessonViews } from './lessonPlan'
import { makeupState } from './makeupRules'
import { buildPaymentViews, type FeeContext } from './paymentPlan'
import { toMinutes, toTime } from './timetable'
import type { Database, NotificationKind, NotificationRule } from './types'

export const NOTIFICATION_KINDS: NotificationKind[] = ['paymentOverdue', 'paymentDue', 'makeupScheduled', 'makeupDeadline', 'lesson']

export const NOTIFICATION_LABELS: Record<NotificationKind, { title: string; description: string }> = {
  paymentOverdue: {
    title: '학원비 미납',
    description: '납부 예정일이 지나도록 납부 완료를 체크하지 않으면 다음날부터 매일 알립니다. 체크하면 멈춥니다.',
  },
  paymentDue: { title: '학원비 납부일', description: '납부 예정일이 다가오면 미리 알립니다.' },
  makeupScheduled: { title: '보강 예정', description: '날짜를 잡은 보강이 다가오면 알립니다.' },
  makeupDeadline: { title: '보강 마감', description: '아직 날짜를 안 잡은 보강의 기한이 다가오면 알립니다.' },
  lesson: { title: '수업 시작 (등원)', description: '수업 시작 전에 알립니다. 기본은 꺼져 있습니다.' },
}

/** 기본 알림 설정. 저장된 것이 없을 때 씁니다. (사용자 방침: 미납은 매일, 등원 알림은 없음) */
export function defaultRule(kind: NotificationKind): NotificationRule {
  const base = { id: kind, kind, createdAt: '', updatedAt: '' }
  switch (kind) {
    case 'paymentOverdue':
      return { ...base, enabled: true, timings: [{ id: 'default', before: 1, time: '09:00' }] }
    case 'paymentDue':
      return { ...base, enabled: false, timings: [{ id: 'default', before: 0, time: '09:00' }] }
    case 'makeupScheduled':
      return { ...base, enabled: true, timings: [{ id: 'default', before: 1, time: '20:00' }] }
    case 'makeupDeadline':
      return { ...base, enabled: true, timings: [{ id: 'default', before: 3, time: '09:00' }] }
    case 'lesson':
      return { ...base, enabled: false, timings: [{ id: 'default', before: 60, time: '00:00' }] }
  }
}

/** 저장된 설정에 없는 종류는 기본값으로 채운 전체 설정 */
export function effectiveRules(stored: NotificationRule[]): Record<NotificationKind, NotificationRule> {
  return Object.fromEntries(
    NOTIFICATION_KINDS.map((kind) => [kind, stored.find((rule) => rule.kind === kind) ?? defaultRule(kind)]),
  ) as Record<NotificationKind, NotificationRule>
}

/** 울릴 알림 하나 */
export interface ScheduledNotification {
  id: string
  kind: NotificationKind
  date: DateStr
  time: TimeStr
  title: string
  body: string
  /** 알림을 누르면 열 화면 */
  link: string
  academyId: string
}

interface ScheduleInput {
  data: Database
  rules: Record<NotificationKind, NotificationRule>
  /** 이날부터 */
  from: DateStr
  /** 며칠 치 (from 포함) */
  days: number
  feeContext: FeeContext
}

/**
 * from부터 days일 동안 울릴 알림 목록 (날짜, 시각 순서).
 * 2단계에서는 미리보기로 보여주고, 3단계(APK)에서 이 목록을 폰에 예약합니다.
 */
export function scheduledNotifications({ data, rules, from, days, feeContext }: ScheduleInput): ScheduledNotification[] {
  const to = addDays(from, days - 1)
  const result: ScheduledNotification[] = []
  const academyById = new Map(data.academies.map((academy) => [academy.id, academy]))
  const childById = new Map(data.children.map((child) => [child.id, child]))
  const manyChildren = data.children.length > 1
  const nameOf = (academyId: string) => {
    const academy = academyById.get(academyId)
    if (!academy) return ''
    const child = manyChildren ? childById.get(academy.childId) : undefined
    return child ? `${child.name} ${academy.name}` : academy.name
  }
  const inRange = (date: DateStr) => date >= from && date <= to

  // ── 학원비 ──
  const overdue = rules.paymentOverdue
  const due = rules.paymentDue
  if (overdue.enabled || due.enabled) {
    const views = buildPaymentViews(data.academies, data.payments, '0000-01-01', to, feeContext).filter((view) => view.status !== 'paid')
    for (const view of views) {
      const amount = formatFee(view.amount)
      if (due.enabled) {
        for (const timing of due.timings) {
          const date = addDays(view.dueOn, -timing.before)
          if (!inRange(date)) continue
          result.push({
            id: `due|${view.key}|${timing.id}`,
            kind: 'paymentDue',
            date,
            time: timing.time,
            title: `${nameOf(view.academyId)} 학원비 납부일`,
            body: `${view.title} ${amount} · ${timing.before === 0 ? '오늘까지' : `${formatDate(view.dueOn)}까지`}`,
            link: '/payments',
            academyId: view.academyId,
          })
        }
      }
      if (overdue.enabled && overdue.timings[0]) {
        // 납부일 다음날(before)부터 매일, 납부 완료를 체크할 때까지
        const timing = overdue.timings[0]
        const start = addDays(view.dueOn, Math.max(1, timing.before))
        for (let date = start > from ? start : from; date <= to; date = addDays(date, 1)) {
          if (date <= view.dueOn) continue
          result.push({
            id: `overdue|${view.key}|${date}`,
            kind: 'paymentOverdue',
            date,
            time: timing.time,
            title: `${nameOf(view.academyId)} 학원비 미납`,
            body: `${view.title} ${amount} · 납부일 ${formatDate(view.dueOn)}에서 ${daysBetween(view.dueOn, date)}일 지남 · 납부 완료를 체크하면 멈춥니다`,
            link: '/payments',
            academyId: view.academyId,
          })
        }
      }
    }
  }

  // ── 보강 ──
  for (const makeup of data.makeups) {
    if (makeup.status !== 'open' || !academyById.has(makeup.academyId)) continue
    const state = makeupState(makeup, feeContext.todayStr)
    if (state === 'scheduled' && rules.makeupScheduled.enabled && makeup.scheduledOn) {
      for (const timing of rules.makeupScheduled.timings) {
        const date = addDays(makeup.scheduledOn, -timing.before)
        if (!inRange(date)) continue
        result.push({
          id: `mk-sched|${makeup.id}|${timing.id}`,
          kind: 'makeupScheduled',
          date,
          time: timing.time,
          title: `${nameOf(makeup.academyId)} 보강 ${timing.before === 0 ? '오늘' : timing.before === 1 ? '내일' : `${timing.before}일 뒤`}`,
          body: `${formatDate(makeup.scheduledOn)} ${makeup.start ?? ''}${makeup.end ? `~${makeup.end}` : ''} · ${formatDate(makeup.missedOn)} 빠진 수업 보강`,
          link: '/makeups',
          academyId: makeup.academyId,
        })
      }
    }
    if (state === 'pending' && rules.makeupDeadline.enabled && makeup.deadline) {
      for (const timing of rules.makeupDeadline.timings) {
        const date = addDays(makeup.deadline, -timing.before)
        if (!inRange(date)) continue
        result.push({
          id: `mk-dead|${makeup.id}|${timing.id}`,
          kind: 'makeupDeadline',
          date,
          time: timing.time,
          title: `${nameOf(makeup.academyId)} 보강 마감 ${timing.before === 0 ? '오늘' : `${timing.before}일 전`}`,
          body: `${formatDate(makeup.missedOn)} 빠진 수업 · ${formatDate(makeup.deadline)}까지 보강 날짜를 잡으세요`,
          link: '/makeups',
          academyId: makeup.academyId,
        })
      }
    }
  }

  // ── 수업 시작 (등원) ──
  if (rules.lesson.enabled) {
    const lessons = buildLessonViews(data.academies, data.lessons, from, to, feeContext.todayStr).filter(
      (view) => view.status === 'planned' && view.start,
    )
    for (const view of lessons) {
      for (const timing of rules.lesson.timings) {
        let minutes = toMinutes(view.start!) - timing.before
        let date = view.date
        if (minutes < 0) {
          minutes += 24 * 60
          date = addDays(date, -1)
        }
        if (!inRange(date)) continue
        result.push({
          id: `lesson|${view.key}|${timing.id}`,
          kind: 'lesson',
          date,
          time: toTime(minutes),
          title: `${nameOf(view.academyId)} 수업 ${timing.before}분 전`,
          body: `${view.start}~${view.end ?? ''} 수업`,
          link: `/calendar?date=${view.date}`,
          academyId: view.academyId,
        })
      }
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title))
}
