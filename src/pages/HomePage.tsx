import { Link } from 'react-router'
import { PlusIcon } from '../components/icons'
import PageHeader from '../components/PageHeader'
import { useChildren } from '../data/children'
import { useSelectedChild } from '../data/SelectedChild'

export default function HomePage() {
  const { children } = useChildren()
  const { selectedChild } = useSelectedChild()

  if (children.length === 0) {
    return (
      <section className="narrow">
        <PageHeader title="홈" />
        <div className="card">
          <h2 className="card-title">학원노트에 오신 것을 환영합니다</h2>
          <p>먼저 자녀를 등록하세요. 자녀마다 학원과 납부, 출석, 보강을 따로 관리할 수 있습니다.</p>
          <Link to="/settings/children/new" className="btn btn-primary">
            <PlusIcon />
            자녀 등록하기
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="narrow">
      <PageHeader title="홈" />
      <div className="card">
        <h2 className="card-title">
          {selectedChild && <span className="dot" style={{ background: selectedChild.color }} />}
          {selectedChild ? `${selectedChild.name}의 일정` : '모든 자녀의 일정'}
        </h2>
        <p>오늘 수업, 예정된 보강, 미납 학원, 마감이 가까운 보강을 여기에 보여줍니다.</p>
        <p className="muted">학원을 등록하는 기능부터 차례로 추가합니다.</p>
      </div>
    </section>
  )
}
