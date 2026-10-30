import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getFamilyState, setFamilyState } from './cloud/family'
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

/**
 * 저장소 고르기.
 * - 가족 코드가 있으면 가족 공유(Firestore). Firebase 코드는 이때만 불러옵니다.
 * - 없으면 혼자 쓰기(IndexedDB). 네트워크를 전혀 쓰지 않습니다.
 */
function getStorage(): Promise<DataStorage> {
  storagePromise ??= (async () => {
    const family = getFamilyState()
    if (family) {
      const { createFirestoreStorage } = await import('./cloud/firestoreStorage')
      return createFirestoreStorage(family.id)
    }
    return createIndexedDbStorage()
  })()
  return storagePromise
}

/** 시작할 때 모든 데이터를 불러와 메모리에 두고, 바꿀 때는 저장에 성공한 뒤 화면에 반영합니다. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [data, setData] = useState<Database>(emptyDatabase)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    getStorage()
      .then(async (storage) => {
        const loaded = await storage.loadAll()
        if (cancelled) return
        setData(loaded)
        setLoad({ status: 'ready', storage })
        // 가족 공유: 다른 기기에서 바뀐 내용을 그대로 반영합니다.
        unsubscribe = storage.subscribe?.((remote) => {
          if (!cancelled) setData(remote)
        })
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoad({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      })
    return () => {
      cancelled = true
      unsubscribe?.()
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
    const family = getFamilyState()
    return (
      <div className="status-screen">
        <p>데이터를 불러오지 못했습니다.</p>
        {load.status === 'error' && <p className="muted">{load.message}</p>}
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          다시 시도
        </button>
        {family && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              // 가족 공유에 연결하지 못할 때 폰에 있던 데이터로 돌아갈 수 있게
              setFamilyState(null)
              window.location.reload()
            }}
          >
            혼자 쓰기로 돌아가기
          </button>
        )}
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
