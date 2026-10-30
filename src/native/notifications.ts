import { Capacitor } from '@capacitor/core'
import type { ScheduledNotification } from '../data/notifications'
import type { DateStr, TimeStr } from '../utils/date'

/** 폰에 한 번에 예약해 두는 최대 개수. 안드로이드는 앱당 알람 수에 한도가 있어 넉넉히 아래로 잡습니다. */
export const MAX_SCHEDULED = 200
/** 며칠 치를 예약해 둘지. 앱을 열 때마다 다시 예약하므로 이보다 멀리 볼 필요가 없습니다. */
export const SCHEDULE_WINDOW_DAYS = 60

export type NotificationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported'

export interface NotificationSyncStatus {
  /** 마지막으로 예약한 시각 (ISO) */
  at: string
  scheduled: number
  permission: NotificationPermission
  windowDays: number
}

const STATUS_KEY = 'academy-note:notification-sync'
export const SYNC_EVENT = 'academy-note:notification-sync'

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** 알림 id는 32비트 정수여야 해서 글자 id를 해시(FNV-1a)로 바꿉니다. 같은 알림은 늘 같은 번호가 됩니다. */
export function notificationId(key: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 2_000_000_000 || 1
}

/** 'YYYY-MM-DD' + 'HH:MM' → 그 기기 시간대의 Date */
export function toDateTime(date: DateStr, time: TimeStr): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

/** 예약할 알림을 고릅니다: 지난 것은 빼고, 가까운 순서로 최대 개수까지. id가 겹치면 뒤의 것을 조금 바꿉니다. */
export function pickUpcoming(list: ScheduledNotification[], now: Date, max = MAX_SCHEDULED) {
  const used = new Set<number>()
  return list
    .map((item) => ({ item, at: toDateTime(item.date, item.time) }))
    .filter(({ at }) => at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, max)
    .map(({ item, at }) => {
      let id = notificationId(item.id)
      while (used.has(id)) id = (id % 1_999_999_999) + 1
      used.add(id)
      return { id, item, at }
    })
}

export function readSyncStatus(): NotificationSyncStatus | null {
  try {
    const raw = localStorage.getItem(STATUS_KEY)
    return raw ? (JSON.parse(raw) as NotificationSyncStatus) : null
  } catch {
    return null
  }
}

function writeSyncStatus(status: NotificationSyncStatus) {
  localStorage.setItem(STATUS_KEY, JSON.stringify(status))
  window.dispatchEvent(new CustomEvent(SYNC_EVENT))
}

/** 알림 권한을 물어봅니다. (안드로이드 13 이상은 사용자가 허용해야 알림이 보입니다) */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNativeApp()) return 'unsupported'
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const result = await LocalNotifications.requestPermissions()
  return result.display === 'granted' ? 'granted' : result.display === 'denied' ? 'denied' : 'prompt'
}

/**
 * 예정된 알림 목록을 폰에 예약합니다. 이미 예약된 것은 모두 지우고 새로 예약합니다.
 * 앱을 열 때, 돌아올 때, 데이터나 알림 설정이 바뀔 때 부릅니다. (NotificationSync 컴포넌트)
 */
export async function syncNotifications(list: ScheduledNotification[], now = new Date()): Promise<NotificationSyncStatus> {
  const base = { at: now.toISOString(), windowDays: SCHEDULE_WINDOW_DAYS }
  if (!isNativeApp()) {
    const status: NotificationSyncStatus = { ...base, scheduled: 0, permission: 'unsupported' }
    writeSyncStatus(status)
    return status
  }
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  let permission = (await LocalNotifications.checkPermissions()).display
  if (permission === 'prompt' || permission === 'prompt-with-rationale') {
    permission = (await LocalNotifications.requestPermissions()).display
  }
  if (permission !== 'granted') {
    const status: NotificationSyncStatus = { ...base, scheduled: 0, permission: 'denied' }
    writeSyncStatus(status)
    return status
  }

  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length > 0) await LocalNotifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) })

  const upcoming = pickUpcoming(list, now)
  if (upcoming.length > 0) {
    await LocalNotifications.schedule({
      notifications: upcoming.map(({ id, item, at }) => ({
        id,
        title: item.title,
        body: item.body,
        schedule: { at, allowWhileIdle: true },
        extra: { link: item.link },
        smallIcon: 'ic_stat_notify',
      })),
    })
  }
  const status: NotificationSyncStatus = { ...base, scheduled: upcoming.length, permission: 'granted' }
  writeSyncStatus(status)
  return status
}

/** 알림을 누르면 해당 화면으로 갑니다. 돌려주는 함수를 부르면 듣기를 멈춥니다. */
export async function onNotificationTap(handler: (link: string) => void): Promise<() => void> {
  if (!isNativeApp()) return () => {}
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const listener = await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const link = (event.notification.extra as { link?: unknown } | undefined)?.link
    if (typeof link === 'string' && link.startsWith('/')) handler(link)
  })
  return () => {
    listener.remove()
  }
}
