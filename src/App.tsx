import { Navigate, Route, Routes } from 'react-router'
import AppShell from './layout/AppShell'
import CalendarPage from './pages/CalendarPage'
import HomePage from './pages/HomePage'
import MakeupsPage from './pages/MakeupsPage'
import PaymentsPage from './pages/PaymentsPage'
import TimetablePage from './pages/TimetablePage'
import AcademiesPage from './pages/settings/AcademiesPage'
import AcademyFormPage from './pages/settings/academy/AcademyFormPage'
import ChildFormPage from './pages/settings/ChildFormPage'
import ChildrenPage from './pages/settings/ChildrenPage'
import SettingsPage from './pages/settings/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="makeups" element={<MakeupsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/children" element={<ChildrenPage />} />
        <Route path="settings/children/new" element={<ChildFormPage />} />
        <Route path="settings/children/:childId" element={<ChildFormPage />} />
        <Route path="settings/academies" element={<AcademiesPage />} />
        <Route path="settings/academies/new" element={<AcademyFormPage />} />
        <Route path="settings/academies/:academyId" element={<AcademyFormPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
