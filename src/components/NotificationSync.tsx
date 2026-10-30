import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useData } from '../data/DataProvider'
import { useNotificationRules } from '../data/notificationRules'
import { scheduledNotifications } from '../data/notifications'
import { useFeeContext } from '../data/payments'
import { isNativeApp, onNotificationTap, SCHEDULE_WINDOW_DAYS, syncNotifications } from '../native/notifications'
import { today } from '../utils/date'

/**
 * APK에서 예정된 알림을 폰에 실제로 예약합니다. 화면에는 아무것도 그리지 않습니다.
 * 데이터나 알림 설정이 바뀌면 잠시 뒤 다시 예약하고, 앱으로 돌아올 때도 다시 예약합니다.
 * 웹(브라우저)에서는 아무 일도 하지 않습니다.
 */
export default function NotificationSync() {
  const { data } = useData()
  const { rules } = useNotificationRules()
  const feeContext = useFeeContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isNativeApp()) return
    let cancelled = false
    const run = () => {
      const list = scheduledNotifications({ data, rules, from: today(), days: SCHEDULE_WINDOW_DAYS, feeContext })
      syncNotifications(list).catch((error: unknown) => console.error('[알림 예약]', error))
    }
    const timer = setTimeout(() => !cancelled && run(), 1500)
    const onVisible = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [data, rules, feeContext])

  useEffect(() => {
    let stop: (() => void) | undefined
    onNotificationTap((link) => navigate(link)).then((remove) => {
      stop = remove
    })
    return () => stop?.()
  }, [navigate])

  return null
}
