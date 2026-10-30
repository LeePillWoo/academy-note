import { Navigate, Route, Routes } from 'react-router'
import AppShell from './layout/AppShell'
import PlaceholderPage from './pages/PlaceholderPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<PlaceholderPage title="홈" description="오늘 수업, 예정된 보강, 미납 학원, 마감이 가까운 보강을 보여줍니다." />} />
        <Route path="calendar" element={<PlaceholderPage title="달력" description="수업일과 출석, 예정된 보강을 달력에 표시합니다." />} />
        <Route path="payments" element={<PlaceholderPage title="납부" description="학원별 납부 내역과 미납, 월별 합계를 보여줍니다." />} />
        <Route path="makeups" element={<PlaceholderPage title="보강" description="남은 보강을 마감이 가까운 순서로 보여줍니다." />} />
        <Route path="settings" element={<PlaceholderPage title="설정" description="자녀, 학원, 알림, 백업을 설정합니다." />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
