import { useEffect, useRef } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useChildren } from '../data/children'
import { useSelectedChild } from '../data/SelectedChild'
import { useTodayTick } from '../hooks/useTodayTick'
import { navItems, settingsIcon } from './navItems'

// 화면 방향에 따라 메뉴 위치가 바뀝니다. (index.css 참고)
// - 세로 화면(휴대폰): 아래쪽 탭 메뉴. 설정은 위쪽 막대 오른쪽의 톱니 단추
// - 가로 화면(PC, 휴대폰 가로): 왼쪽 메뉴 (설정 포함)
export default function AppShell() {
  const { children } = useChildren()
  const topbarRef = useRef<HTMLElement>(null)
  // 자정이 지나거나 앱으로 돌아오면 다시 그려서 "오늘"과 자동 출석이 맞게 보이게 합니다.
  useTodayTick()
  // 자녀가 2명 이상일 때만 자녀 선택을 보여줍니다.
  const showSwitcher = children.length >= 2

  // 위쪽 막대 높이를 CSS 변수로 알려줍니다. 학습 보드의 요일 줄이 그 아래에 붙어 따라오게 하기 위해서입니다.
  useEffect(() => {
    const topbar = topbarRef.current
    if (!topbar) return
    const update = () => document.documentElement.style.setProperty('--topbar-height', `${topbar.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(topbar)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="shell">
      <nav className="nav" aria-label="주 메뉴">
        <div className="nav-brand">
          <Logo />
        </div>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={item.railOnly ? 'nav-item is-rail-only' : 'nav-item'}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="main">
        <header ref={topbarRef} className={showSwitcher ? 'topbar has-switcher' : 'topbar'}>
          <span className="topbar-brand">
            <Logo />
            <span className="brand-text">학원노트</span>
          </span>
          {showSwitcher && <ChildSwitcher />}
          <NavLink to="/settings" className="icon-btn topbar-settings" aria-label="설정">
            {settingsIcon}
          </NavLink>
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
