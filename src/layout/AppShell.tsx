import { NavLink, Outlet } from 'react-router'
import { useChildren } from '../data/children'
import { useSelectedChild } from '../data/SelectedChild'
import { navItems } from './navItems'

// 화면 너비에 따라 메뉴 위치가 바뀝니다. (index.css 참고)
// - 휴대폰 세로: 아래쪽 탭 메뉴
// - 휴대폰 가로, 태블릿: 왼쪽 좁은 메뉴
// - PC: 왼쪽 넓은 메뉴
export default function AppShell() {
  const { children } = useChildren()
  // 자녀가 2명 이상일 때만 자녀 선택을 보여줍니다.
  const showSwitcher = children.length >= 2

  return (
    <div className="shell">
      <nav className="nav" aria-label="주 메뉴">
        <div className="nav-brand">학원노트</div>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-item">
            {item.icon}
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="main">
        <header className={showSwitcher ? 'topbar has-switcher' : 'topbar'}>
          <span className="topbar-brand">학원노트</span>
          {showSwitcher && <ChildSwitcher />}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function ChildSwitcher() {
  const { children } = useChildren()
  const { selectedChildId, selectChild } = useSelectedChild()

  return (
    <div className="chips" role="group" aria-label="자녀 선택">
      <button type="button" className="chip" aria-pressed={selectedChildId === null} onClick={() => selectChild(null)}>
        전체
      </button>
      {children.map((child) => (
        <button key={child.id} type="button" className="chip" aria-pressed={selectedChildId === child.id}
          onClick={() => selectChild(child.id)}>
          <span className="dot" style={{ background: child.color }} />
          {child.name}
        </button>
      ))}
    </div>
  )
}
