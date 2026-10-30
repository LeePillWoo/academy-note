import { NavLink, Outlet } from 'react-router'
import { navItems } from './navItems'

// 화면 너비에 따라 메뉴 위치가 바뀝니다. (index.css 참고)
// - 휴대폰 세로: 아래쪽 탭 메뉴
// - 휴대폰 가로, 태블릿: 왼쪽 좁은 메뉴
// - PC: 왼쪽 넓은 메뉴
export default function AppShell() {
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
        <header className="topbar">
          <span className="topbar-brand">학원노트</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
