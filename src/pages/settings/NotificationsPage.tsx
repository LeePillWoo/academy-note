import { useMemo } from 'react'
import { Link } from 'react-router'
import { PlusIcon, TrashIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { useData } from '../../data/DataProvider'
import { newId } from '../../data/id'
import { NOTIFICATION_KINDS, NOTIFICATION_LABELS, scheduledNotifications, type ScheduledNotification } from '../../data/notifications'
import { useNotificationRules } from '../../data/notificationRules'
import { useFeeContext } from '../../data/payments'
import type { NotificationKind, NotificationRule, NotificationTiming } from '../../data/types'
import { formatDate, today, type DateStr } from '../../utils/date'

/** 미리보기로 보여줄 기간 */
const PREVIEW_DAYS = 30
const PREVIEW_LIMIT = 40
const DAY_OPTIONS = [0, 1, 2, 3, 5, 7]
const MINUTE_OPTIONS = [10, 20, 30, 60, 90, 120]

const KIND_SHORT: Record<NotificationKind, string> = {
  paymentOverdue: '미납',
  paymentDue: '납부일',
  makeupScheduled: '보강',
  makeupDeadline: '마감',
  lesson: '수업',
}

/** 설정 > 알림: 종류별로 켜고 끄기, 언제 받을지, 앞으로 울릴 알림 미리보기 */
export default function NotificationsPage() {
  const { data } = useData()
  const { rules, saveRule } = useNotificationRules()
  const feeContext = useFeeContext()
  const todayStr = today()
  const scheduled = useMemo(
    () => scheduledNotifications({ data, rules, from: todayStr, days: PREVIEW_DAYS, feeContext }),
    [data, rules, todayStr, feeContext],
  )
  const byDate = useMemo(() => {
    const map = new Map<DateStr, ScheduledNotification[]>()
    for (const item of scheduled.slice(0, PREVIEW_LIMIT)) map.set(item.date, [...(map.get(item.date) ?? []), item])
    return map
  }, [scheduled])

  function update(kind: NotificationKind, patch: Partial<Pick<NotificationRule, 'enabled' | 'timings'>>) {
    saveRule(kind, patch).catch(() => window.alert('저장하지 못했습니다. 다시 시도하세요.'))
  }

  return (
    <section className="narrow">
      <PageHeader title="알림" subtitle="언제 알림을 받을지 정합니다." backTo="/settings" />
      <p className="note">
        실제 알림은 앱(APK)으로 설치한 뒤에 울립니다. 지금은 설정을 저장하고, 아래 미리보기로 언제 울릴지 확인할 수 있습니다.
      </p>

      {NOTIFICATION_KINDS.map((kind) => (
        <RuleCard key={kind} kind={kind} rule={rules[kind]} onChange={(patch) => update(kind, patch)} />
      ))}

      <div className="home-section">
        <h2 className="section-heading">
          예정된 알림 <span className="muted">앞으로 {PREVIEW_DAYS}일</span>
        </h2>
        {scheduled.length === 0 ? (
          <div className="card">
            <p className="muted">앞으로 {PREVIEW_DAYS}일 동안 울릴 알림이 없습니다.</p>
          </div>
        ) : (
          <div className="card schedule-card">
            {[...byDate].map(([date, items]) => (
              <div key={date} className="schedule-day">
                <h3 className="schedule-date">
                  {formatDate(date)}
                  {date === todayStr && <span className="badge status-today">오늘</span>}
                </h3>
                {items.map((item) => (
                  <Link key={item.id} to={item.link} className="schedule-item">
                    <span className="schedule-time">{item.time}</span>
                    <span className="schedule-text">
                      <span className="schedule-title">
                        <span className={`badge kind-${item.kind}`}>{KIND_SHORT[item.kind]}</span>
                        {item.title}
                      </span>
                      <span className="muted">{item.body}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
            {scheduled.length > PREVIEW_LIMIT && <p className="muted">…외 {scheduled.length - PREVIEW_LIMIT}개</p>}
          </div>
        )}
      </div>
    </section>
  )
}

interface RuleCardProps {
  kind: NotificationKind
  rule: NotificationRule
  onChange(patch: Partial<Pick<NotificationRule, 'enabled' | 'timings'>>): void
}

/** 알림 종류 하나: 켜기/끄기와 언제 받을지 */
function RuleCard({ kind, rule, onChange }: RuleCardProps) {
  const label = NOTIFICATION_LABELS[kind]
  const isMinutes = kind === 'lesson'
  const isDaily = kind === 'paymentOverdue'

  function updateTiming(id: string, patch: Partial<NotificationTiming>) {
    onChange({ timings: rule.timings.map((timing) => (timing.id === id ? { ...timing, ...patch } : timing)) })
  }

  function addTiming() {
    const last = rule.timings[rule.timings.length - 1]
    onChange({ timings: [...rule.timings, { id: newId(), before: isMinutes ? 30 : 1, time: last?.time ?? '09:00' }] })
  }

  function removeTiming(id: string) {
    if (rule.timings.length <= 1) return
    onChange({ timings: rule.timings.filter((timing) => timing.id !== id) })
  }

  return (
    <div className="card rule-card">
      <div className="rule-head">
        <div>
          <h2 className="card-title">{label.title}</h2>
          <p className="muted">{label.description}</p>
        </div>
        <label className="switch">
          <input type="checkbox" role="switch" checked={rule.enabled} aria-label={`${label.title} 알림`}
            onChange={(event) => onChange({ enabled: event.target.checked })} />
          <span className="switch-track" />
        </label>
      </div>

      {rule.enabled &&
        (isDaily ? (
          <div className="timing-row">
            <span>납부일 다음날부터 매일</span>
            <input type="time" className="input time-input" step={300} value={rule.timings[0]?.time ?? '09:00'}
              aria-label="미납 알림 시각" onChange={(event) => updateTiming(rule.timings[0].id, { time: event.target.value })} />
            <span>에, 납부 완료를 체크할 때까지</span>
          </div>
        ) : (
          <div className="form-stack">
            {rule.timings.map((timing) => (
              <div key={timing.id} className="timing-row">
                <select className="input" value={timing.before} aria-label={isMinutes ? '수업 몇 분 전' : '며칠 전'}
                  onChange={(event) => updateTiming(timing.id, { before: Number(event.target.value) })}>
                  {(isMinutes ? MINUTE_OPTIONS : DAY_OPTIONS).map((value) => (
                    <option key={value} value={value}>
                      {isMinutes ? `${value}분 전` : value === 0 ? '당일' : `${value}일 전`}
                    </option>
                  ))}
                </select>
                {!isMinutes && (
                  <input type="time" className="input time-input" step={300} value={timing.time} aria-label="알림 시각"
                    onChange={(event) => updateTiming(timing.id, { time: event.target.value })} />
                )}
                <button type="button" className="icon-btn" aria-label="이 알림 시각 삭제" disabled={rule.timings.length <= 1}
                  onClick={() => removeTiming(timing.id)}>
                  <TrashIcon />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-small" onClick={addTiming}>
              <PlusIcon />
              알림 시각 추가
            </button>
          </div>
        ))}
    </div>
  )
}
