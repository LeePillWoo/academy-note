import { useEffect, useState } from 'react'

/**
 * 날짜가 바뀌면(자정, 또는 앱으로 돌아왔을 때) 화면을 다시 그리게 합니다.
 * 지난 수업의 자동 출석, "오늘" 표시, 납부일 지남 같은 것이 앱을 켜 둔 채로도 갱신됩니다.
 */
export function useTodayTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    let timer = 0
    const schedule = () => {
      const now = new Date()
      // 자정 5초 뒤에 한 번 더 그립니다.
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5)
      timer = window.setTimeout(() => {
        setTick((tick) => tick + 1)
        schedule()
      }, next.getTime() - now.getTime())
    }
    schedule()
    const onVisible = () => {
      if (document.visibilityState === 'visible') setTick((tick) => tick + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
}
