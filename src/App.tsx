import { Navigate, Route, Routes } from 'react-router'
import AppShell from './layout/AppShell'
import HomePage from './pages/HomePage'
import PlaceholderPage from './pages/PlaceholderPage'
import ChildFormPage from './pages/settings/ChildFormPage'
import ChildrenPage from './pages/settings/ChildrenPage'
import SettingsPage from './pages/settings/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="calendar" element={<PlaceholderPage title="달력" description="수업일과 출석, 예정된 보강을 달력에 표시합니다." />} />
        <Route path="payments" element={<PlaceholderPage title="납부" description="학원별 납부 내역과 미납, 월별 합계를 보여줍니다." />} />
        <Route path="makeups" element={<PlaceholderPage title="보강" description="남은 보강을 마감이 가까운 순서로 보여줍니다." />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/children" element={<ChildrenPage />} />
        <Route path="settings/children/new" element={<ChildFormPage />} />
        <Route path="settings/children/:childId" element={<ChildFormPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
