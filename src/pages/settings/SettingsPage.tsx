import { Link } from 'react-router'
import { ChevronRightIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { useChildren } from '../../data/children'

// 아직 만들지 않은 설정. 만들면 링크로 바꿉니다.
const UPCOMING = ['학원', '알림', '백업과 복원']

export default function SettingsPage() {
  const { children } = useChildren()

  return (
    <section className="narrow">
      <PageHeader title="설정" />
      <ul className="list">
        <li>
          <Link to="/settings/children" className="list-row list-link">
            <span className="list-text">자녀</span>
            <span className="muted">{children.length}명</span>
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
