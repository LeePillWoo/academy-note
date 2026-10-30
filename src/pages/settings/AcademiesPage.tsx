import { Link } from 'react-router'
import { ChevronRightIcon, PlusIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { useAcademies } from '../../data/academies'
import { describeFee, describeWeekdays, periodAt } from '../../data/academyRules'
import { useChildren } from '../../data/children'
import { useSelectedChild } from '../../data/SelectedChild'
import { formatDate, today } from '../../utils/date'

/** 학원 목록. 전체를 보고 있으면 자녀별로 묶어서 보여줍니다. */
export default function AcademiesPage() {
  const { children } = useChildren()
  const { academies } = useAcademies()
  const { selectedChild } = useSelectedChild()
  const now = today()

  if (children.length === 0) {
    return (
      <section className="narrow">
        <PageHeader title="학원" backTo="/settings" />
        <div className="card">
          <p>학원을 등록하려면 먼저 자녀를 등록하세요.</p>
          <Link to="/settings/children/new" className="btn btn-primary">자녀 등록하기</Link>
        </div>
      </section>
    )
  }

  const groups = selectedChild ? [selectedChild] : children

  return (
    <section className="narrow">
      <PageHeader title="학원" backTo="/settings" />
      {groups.map((child) => {
        const list = academies.filter((academy) => academy.childId === child.id)
        return (
          <div key={child.id} className="group">
            {children.length > 1 && (
              <h2 className="group-title">
                <span className="dot" style={{ background: child.color }} />
                {child.name}
              </h2>
            )}
            {list.length === 0 ? (
              <p className="muted group-empty">등록된 학원이 없습니다.</p>
            ) : (
              <ul className="list">
                {list.map((academy) => (
                  <li key={academy.id}>
                    <Link to={`/settings/academies/${academy.id}`} className="list-row list-link">
                      <span className="dot" style={{ background: academy.color }} />
                      <span className="list-text">
                        <span className="list-title">{academy.name}</span>
                        <span className="list-sub">
                          {academy.endedOn && (
                            <span className="ended-tag">{academy.endedOn <= now ? '그만둠' : `${formatDate(academy.endedOn)}까지`}</span>
                          )}
                          {academy.subject && `${academy.subject} · `}
                          {describeWeekdays(periodAt(academy.schedules, now))} · {describeFee(periodAt(academy.fees, now))}
                        </span>
                      </span>
                      <ChevronRightIcon />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
      <Link to="/settings/academies/new" className="btn btn-primary btn-block">
        <PlusIcon />
        학원 추가
      </Link>
    </section>
  )
}
