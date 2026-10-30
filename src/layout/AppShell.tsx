import { NavLink, Outlet } from 'react-router'
import { useChildren } from '../data/children'
import { useSelectedChild } from '../data/SelectedChild'
import { navItems } from './navItems'

// 화면 방향에 따라 메뉴 위치가 바뀝니다. (index.css 참고)
// - 세로 화면(휴대폰): 아래쪽 탭 메뉴
// - 가로 화면(PC, 휴대폰 가로): 왼쪽 메뉴
export default function AppShell() {
  const { children } = useChildren()
  // 자녀가 2명 이상일 때만 자녀 선택을 보여줍니다.
  const showSwitcher = children.length >= 2

  return (
    <div className="shell">
      <nav className="nav" aria-label="주 메뉴">
        <div className="nav-brand">
          <Logo />
        </div>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-item">
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="main">
        <header className={showSwitcher ? 'topbar has-switcher' : 'topbar'}>
          <span className="topbar-brand">
            <Logo />
            <span className="brand-text">학원노트</span>
          </span>
          {showSwitcher && <ChildSwitcher />}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <span className="logo" aria-label="학원노트" role="img">
      학
    </span>
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
