import { Link } from 'react-router'
import { ChevronRightIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { useAcademies } from '../../data/academies'
import { useChildren } from '../../data/children'
import { useNotificationRules } from '../../data/notificationRules'
import { NOTIFICATION_KINDS } from '../../data/notifications'

// 아직 만들지 않은 설정. 만들면 링크로 바꿉니다.
const UPCOMING = ['백업과 복원']

export default function SettingsPage() {
  const { children } = useChildren()
  const { academies } = useAcademies()
  const { rules } = useNotificationRules()
  const enabledCount = NOTIFICATION_KINDS.filter((kind) => rules[kind].enabled).length

  return (
    <section className="narrow">
      <PageHeader title="설정" subtitle="자녀와 학원 정보를 관리하세요." />
      <ul className="list">
        <li>
          <Link to="/settings/children" className="list-row list-link">
            <span className="list-text">자녀</span>
            <span className="muted">{children.length}명</span>
            <ChevronRightIcon />
          </Link>
        </li>
        <li>
          <Link to="/settings/academies" className="list-row list-link">
            <span className="list-text">학원</span>
            <span className="muted">{academies.length}곳</span>
            <ChevronRightIcon />
          </Link>
        </li>
        <li>
          <Link to="/settings/notifications" className="list-row list-link">
            <span className="list-text">알림</span>
            <span className="muted">{enabledCount}개 켜짐</span>
            <ChevronRightIcon />
          </Link>
        </li>
        {UPCOMING.map((label) => (
          <li key={label} className="list-row is-disabled">
            <span className="list-text">{label}</span>
            <span className="muted">준비 중</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
