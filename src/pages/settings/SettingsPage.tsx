import { Link } from 'react-router'
import { ChevronRightIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { useAcademies } from '../../data/academies'
import { useChildren } from '../../data/children'
import { formatFamilyCode, getFamilyState } from '../../data/cloud/family'
import { useNotificationRules } from '../../data/notificationRules'
import { NOTIFICATION_KINDS } from '../../data/notifications'
import { formatDate } from '../../utils/date'
import { lastBackupDate } from './BackupPage'

export default function SettingsPage() {
  const { children } = useChildren()
  const { academies } = useAcademies()
  const { rules } = useNotificationRules()
  const enabledCount = NOTIFICATION_KINDS.filter((kind) => rules[kind].enabled).length
  const family = getFamilyState()
  const lastBackup = lastBackupDate()

  const items = [
    { to: '/settings/children', label: '자녀', sub: `${children.length}명` },
    { to: '/settings/academies', label: '학원', sub: `${academies.length}곳` },
    { to: '/settings/notifications', label: '알림', sub: `${enabledCount}개 켜짐` },
    { to: '/settings/backup', label: '백업과 복원', sub: lastBackup ? `마지막 ${formatDate(lastBackup)}` : '아직 백업 없음' },
    { to: '/settings/family', label: '가족 공유', sub: family ? `공유 중 · ${formatFamilyCode(family.id)}` : '혼자 쓰기' },
  ]

  return (
    <section className="narrow">
      <PageHeader title="설정" subtitle="자녀와 학원 정보를 관리하세요." />
      <ul className="list">
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="list-row list-link">
              <span className="list-text">{item.label}</span>
              <span className="muted">{item.sub}</span>
              <ChevronRightIcon />
            </Link>
          </li>
        ))}
      </ul>
      <p className="muted hint">앱 버전 1.0.0 · 기록은 이 폰에 저장됩니다. 폰을 바꾸기 전에 백업을 내보내 두세요.</p>
    </section>
  )
}
