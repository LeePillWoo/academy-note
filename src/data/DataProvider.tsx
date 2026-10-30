import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createIndexedDbStorage } from './indexedDbStorage'
import { applyChanges, emptyDatabase, type DataStorage } from './storage'
import type { Change, Database } from './types'

interface DataContextValue {
  data: Database
  apply(changes: Change[]): Promise<void>
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; storage: DataStorage }

const DataContext = createContext<DataContextValue | null>(null)

let storagePromise: Promise<DataStorage> | undefined

// 3단계에서 APK로 실행 중이면 SQLite 저장소를 고르도록 바꿉니다.
function getStorage() {
  storagePromise ??= createIndexedDbStorage()
  return storagePromise
}

/** 시작할 때 모든 데이터를 불러와 메모리에 두고, 바꿀 때는 저장에 성공한 뒤 화면에 반영합니다. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [data, setData] = useState<Database>(emptyDatabase)

  useEffect(() => {
    let cancelled = false
    getStorage()
      .then(async (storage) => {
        const loaded = await storage.loadAll()
        if (cancelled) return
        setData(loaded)
        setLoad({ status: 'ready', storage })
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoad({ status: 'error', message: String(error) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<DataContextValue | null>(() => {
    if (load.status !== 'ready') return null
    return {
      data,
      async apply(changes) {
        await load.storage.apply(changes)
        setData((prev) => applyChanges(prev, changes))
      },
    }
  }, [load, data])

  if (load.status === 'loading') {
    return <div className="status-screen">불러오는 중…</div>
  }
  if (load.status === 'error' || !value) {
    return (
      <div className="status-screen">
        <p>데이터를 불러오지 못했습니다.</p>
        {load.status === 'error' && <p className="muted">{load.message}</p>}
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          다시 시도
        </button>
      </div>
    )
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const value = useContext(DataContext)
  if (!value) throw new Error('useData는 DataProvider 안에서만 쓸 수 있습니다.')
  return value
}
