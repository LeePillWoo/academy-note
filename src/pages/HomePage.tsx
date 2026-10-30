import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PlusIcon } from '../components/icons'
import LessonRow from '../components/LessonRow'
import LessonSheet from '../components/LessonSheet'
import MakeupRow from '../components/MakeupRow'
import MakeupSheet from '../components/MakeupSheet'
import PageHeader from '../components/PageHeader'
import { useScopedAcademies } from '../data/academies'
import { useChildren } from '../data/children'
import { buildLessonViews, type LessonView } from '../data/lessonPlan'
import { useLessons } from '../data/lessons'
import { isOpenState, makeupState, urgencyKey } from '../data/makeupRules'
import { useMakeups } from '../data/makeups'
import { useSelectedChild } from '../data/SelectedChild'
import { formatDate, today } from '../utils/date'

export default function HomePage() {
  const { children } = useChildren()
  const academies = useScopedAcademies()
  const { lessons } = useLessons()
  const { selectedChild } = useSelectedChild()
  const { makeups } = useMakeups()
  const [editing, setEditing] = useState<LessonView | null>(null)
  const [openMakeupId, setOpenMakeupId] = useState<string | null>(null)
  const todayStr = today()
  const todayViews = useMemo(() => buildLessonViews(academies, lessons, todayStr, todayStr, todayStr), [academies, lessons, todayStr])
  // 남은 보강(미정, 예정)을 급한 순서로
  const openMakeups = useMemo(() => {
    const ids = new Set(academies.map((academy) => academy.id))
    return makeups
      .filter((makeup) => ids.has(makeup.academyId) && isOpenState(makeupState(makeup, todayStr)))
      .sort((a, b) => urgencyKey(a).localeCompare(urgencyKey(b)))
  }, [academies, makeups, todayStr])

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

  if (academies.length === 0) {
    return (
      <section className="narrow">
        <PageHeader title="홈" />
        <div className="card">
          <h2 className="card-title">
            {selectedChild && <span className="dot" style={{ background: selectedChild.color }} />}
            {selectedChild ? `${selectedChild.name}의 학원` : '학원'}
          </h2>
          <p>등록된 학원이 없습니다. 학원을 등록하면 수업일, 납부, 보강을 관리할 수 있습니다.</p>
          <Link to="/settings/academies/new" className="btn btn-primary">
            <PlusIcon />
            학원 등록하기
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="narrow">
      <PageHeader title="홈" />
      <div className="home-section">
        <h2 className="section-heading">
          오늘 수업 <span className="muted">{formatDate(todayStr)}</span>
        </h2>
        {todayViews.length === 0 ? (
          <div className="card">
            <p className="muted">오늘은 수업이 없습니다.</p>
          </div>
        ) : (
          <ul className="list">
            {todayViews.map((view) => (
              <li key={view.key}>
                <LessonRow view={view} onClick={() => setEditing(view)} />
              </li>
            ))}
          </ul>
        )}
        <Link to="/calendar" className="section-link">달력에서 다른 날 보기</Link>
      </div>
      {openMakeups.length > 0 && (
        <div className="home-section">
          <h2 className="section-heading">
            남은 보강 <span className="muted">{openMakeups.length}개</span>
          </h2>
          <ul className="list">
            {openMakeups.slice(0, 5).map((makeup) => (
              <li key={makeup.id}>
                <MakeupRow makeup={makeup} onClick={() => setOpenMakeupId(makeup.id)} />
              </li>
            ))}
          </ul>
          <Link to="/makeups" className="section-link">보강 전체 보기</Link>
        </div>
      )}
      <div className="card">
        <p className="muted">미납 학원은 다음 조각(납부)에서 이곳에 보여줍니다.</p>
      </div>
      <LessonSheet view={editing} onClose={() => setEditing(null)} />
      <MakeupSheet makeup={makeups.find((makeup) => makeup.id === openMakeupId) ?? null} onClose={() => setOpenMakeupId(null)} />
    </section>
  )
}
