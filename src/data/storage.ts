import type { BaseRecord, Change, CollectionName, Database } from './types'

/**
 * 저장소 계층. 화면 코드는 이 인터페이스만 씁니다.
 * - 웹 단계: IndexedDB (indexedDbStorage.ts)
 * - APK 단계: SQLite (3단계에서 추가)
 */
export interface DataStorage {
  loadAll(): Promise<Database>
  /** 여러 변경을 한 번에 저장합니다. 하나라도 실패하면 모두 취소됩니다. */
  apply(changes: Change[]): Promise<void>
}

export function emptyDatabase(): Database {
  return { children: [], academies: [], lessons: [] }
}

/** 저장에 성공한 변경을 화면에서 쓰는 데이터에 반영합니다. */
export function applyChanges(db: Database, changes: Change[]): Database {
  const next = { ...db } as Record<CollectionName, BaseRecord[]>
  for (const change of changes) {
    const list = next[change.collection]
    if (change.type === 'put') {
      const exists = list.some((record) => record.id === change.item.id)
      next[change.collection] = exists
        ? list.map((record) => (record.id === change.item.id ? change.item : record))
        : [...list, change.item]
    } else {
      next[change.collection] = list.filter((record) => record.id !== change.id)
    }
  }
  return next as Database
}
