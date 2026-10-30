import { useMemo } from 'react'
import { useData } from './DataProvider'
import { nowIso } from './id'
import { effectiveRules } from './notifications'
import type { NotificationKind, NotificationRule } from './types'

/** 알림 설정(종류별)과 바꾸는 기능 */
export function useNotificationRules() {
  const { data, apply } = useData()
  const rules = useMemo(() => effectiveRules(data.notificationRules), [data.notificationRules])

  async function saveRule(kind: NotificationKind, patch: Partial<Pick<NotificationRule, 'enabled' | 'timings'>>) {
    const now = nowIso()
    const current = rules[kind]
    const item: NotificationRule = { ...current, ...patch, createdAt: current.createdAt || now, updatedAt: now }
    await apply([{ type: 'put', collection: 'notificationRules', item }])
  }

  return { rules, saveRule }
}
