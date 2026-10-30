import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PlusIcon } from '../components/icons'
import MakeupRow from '../components/MakeupRow'
import MakeupSheet from '../components/MakeupSheet'
import PageHeader from '../components/PageHeader'
import { useScopedAcademies } from '../data/academies'
import { isOpenState, makeupState, urgencyKey } from '../data/makeupRules'
import { useMakeups } from '../data/makeups'
import type { Makeup } from '../data/types'
import { today } from '../utils/date'

/** 보강 목록: 남은 보강(급한 순서), 기한 만료, 지난 보강 */
export default function MakeupsPage() {
  const academies = useScopedAcademies()
  const { makeups } = useMakeups()
  const [openId, setOpenId] = useState<string | null>(null)
  const todayStr = today()

  const groups = useMemo(() => {
    const ids = new Set(academies.map((academy) => academy.id))
    const list = makeups.filter((makeup) => ids.has(makeup.academyId)).map((makeup) => ({ makeup, state: makeupState(makeup, todayStr) }))
    const byRecent = (a: Makeup, b: Makeup) => (b.scheduledOn ?? b.missedOn).localeCompare(a.scheduledOn ?? a.missedOn)
    return {
      open: list.filter((item) => isOpenState(item.state)).map((item) => item.makeup).sort((a, b) => urgencyKey(a).localeCompare(urgencyKey(b))),
      expired: list.filter((item) => item.state === 'expired').map((item) => item.makeup).sort(byRecent),
      closed: list.filter((item) => item.state === 'done' || item.state === 'skipped').map((item) => item.makeup).sort(byRecent),
    }
  }, [academies, makeups, todayStr])

  // 저장한 뒤에도 최신 내용으로 보이도록 id로 찾습니다.
  const opened = makeups.find((makeup) => makeup.id === openId) ?? null

  if (academies.length === 0) {
    return (
      <section className="narrow">
        <PageHeader title="보강" subtitle="빠진 수업의 보강을 챙기세요." />
        <div className="card">
          <p>등록된 학원이 없습니다.</p>
          <Link to="/settings/academies/new" className="btn btn-primary">
            <PlusIcon />
            학원 등록하기
          </Link>
        </div>
      </section>
    )
  }

  const renderList = (list: Makeup[]) => (
    <ul className="list">
      {list.map((makeup) => (
        <li key={makeup.id}>
          <MakeupRow makeup={makeup} onClick={() => setOpenId(makeup.id)} />
        </li>
      ))}
    </ul>
  )

  return (
    <section className="narrow">
      <PageHeader title="보강" subtitle="빠진 수업의 보강을 챙기세요." />

      <div className="home-section">
        <h2 className="section-heading">남은 보강 <span className="muted">{groups.open.length}개</span></h2>
        {groups.open.length === 0 ? (
          <div className="card">
            <p className="muted">남은 보강이 없습니다. 달력이나 홈에서 결석·휴강을 기록하면 보강이 자동으로 생깁니다.</p>
          </div>
        ) : (
          renderList(groups.open)
        )}
      </div>

      {groups.expired.length > 0 && (
        <div className="home-section">
          <h2 className="section-heading">기한 만료 <span className="muted">{groups.expired.length}개</span></h2>
          {renderList(groups.expired)}
        </div>
      )}

      {groups.closed.length > 0 && (
        <details className="home-section">
          <summary className="section-heading summary">지난 보강 <span className="muted">{groups.closed.length}개</span></summary>
          {renderList(groups.closed)}
        </details>
      )}

      <MakeupSheet makeup={opened} onClose={() => setOpenId(null)} />
    </section>
  )
}
