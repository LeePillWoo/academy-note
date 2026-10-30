import { Link } from 'react-router'
import { PlusIcon } from '../components/icons'
import PageHeader from '../components/PageHeader'
import { useAcademies } from '../data/academies'
import { useChildren } from '../data/children'
import { useSelectedChild } from '../data/SelectedChild'

export default function HomePage() {
  const { children } = useChildren()
  const { academies } = useAcademies()
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

  const scoped = selectedChild ? academies.filter((academy) => academy.childId === selectedChild.id) : academies

  return (
    <section className="narrow">
      <PageHeader title="홈" />
      <div className="card">
        <h2 className="card-title">
          {selectedChild && <span className="dot" style={{ background: selectedChild.color }} />}
          {selectedChild ? `${selectedChild.name}의 일정` : '모든 자녀의 일정'}
        </h2>
        {scoped.length === 0 ? (
          <>
            <p>등록된 학원이 없습니다. 학원을 등록하면 수업일, 납부, 보강을 관리할 수 있습니다.</p>
            <Link to="/settings/academies/new" className="btn btn-primary">
              <PlusIcon />
              학원 등록하기
            </Link>
          </>
        ) : (
          <>
            <p>학원 {scoped.length}곳: {scoped.map((academy) => academy.name).join(', ')}</p>
            <p className="muted">오늘 수업, 예정된 보강, 미납 학원은 다음 단계에서 이곳에 보여줍니다.</p>
          </>
        )}
      </div>
    </section>
  )
}
