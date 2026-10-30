import { createContext, useContext, useState, type ReactNode } from 'react'
import { useChildren } from './children'
import type { Child } from './types'

const STORAGE_KEY = 'academy-note:selected-child'

interface SelectedChildValue {
  /** 고른 자녀의 id. null이면 전체입니다. */
  selectedChildId: string | null
  selectedChild: Child | null
  selectChild(id: string | null): void
}

const SelectedChildContext = createContext<SelectedChildValue | null>(null)

/** 화면 위쪽에서 고른 자녀(전체/첫째/둘째)를 기억합니다. 앱을 다시 열어도 유지됩니다. */
export function SelectedChildProvider(props: { children: ReactNode }) {
  const { children } = useChildren()
  const [storedId, setStoredId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))

  // 고른 자녀가 삭제되었으면 전체로 봅니다.
  const selectedChild = children.find((child) => child.id === storedId) ?? null

  function selectChild(id: string | null) {
    setStoredId(id)
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <SelectedChildContext.Provider value={{ selectedChildId: selectedChild?.id ?? null, selectedChild, selectChild }}>
      {props.children}
    </SelectedChildContext.Provider>
  )
}

export function useSelectedChild() {
  const value = useContext(SelectedChildContext)
  if (!value) throw new Error('useSelectedChild는 SelectedChildProvider 안에서만 쓸 수 있습니다.')
  return value
}
