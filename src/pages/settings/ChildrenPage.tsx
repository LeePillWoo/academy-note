import { Link } from 'react-router'
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, PlusIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { useChildren } from '../../data/children'

/** 자녀 목록. 누르면 수정하고, 화살표로 순서를 바꿉니다. */
export default function ChildrenPage() {
  const { children, moveChild } = useChildren()

  function move(id: string, direction: -1 | 1) {
    moveChild(id, direction).catch(() => window.alert('순서를 바꾸지 못했습니다. 다시 시도하세요.'))
  }

  return (
    <section className="narrow">
      <PageHeader title="자녀" backTo="/settings" />

      {children.length === 0 ? (
        <div className="card">
          <p>등록된 자녀가 없습니다.</p>
          <p className="muted">자녀를 등록하면 학원과 일정을 자녀별로 나눠서 볼 수 있습니다.</p>
        </div>
      ) : (
        <ul className="list">
          {children.map((child, index) => (
            <li key={child.id} className="list-row">
              <Link to={`/settings/children/${child.id}`} className="list-main">
                <span className="dot" style={{ background: child.color }} />
                <span className="list-text">{child.name}</span>
                <ChevronRightIcon />
              </Link>
              <div className="row-actions">
                <button type="button" className="icon-btn" onClick={() => move(child.id, -1)}
                  disabled={index === 0} aria-label={`${child.name} 앞으로`}>
                  <ArrowUpIcon />
                </button>
                <button type="button" className="icon-btn" onClick={() => move(child.id, 1)}
                  disabled={index === children.length - 1} aria-label={`${child.name} 뒤로`}>
                  <ArrowDownIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/settings/children/new" className="btn btn-primary btn-block">
        <PlusIcon />
        자녀 추가
      </Link>
      {children.length > 1 && <p className="muted hint">화살표로 순서를 바꾸면 화면 위쪽 자녀 선택 순서도 바뀝니다.</p>}
    </section>
  )
}
