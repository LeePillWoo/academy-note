import type { BaseRecord, Change, CollectionName, Database } from './types'

/**
 * 저장소 계층. 화면 코드는 이 인터페이스만 씁니다.
 * - 혼자 쓰기: IndexedDB (indexedDbStorage.ts) — 폰 안에만 저장
 * - 가족 공유: Firestore (cloud/firestoreStorage.ts) — 가족 코드로 묶인 기기끼리 실시간 동기화
 */
export interface DataStorage {
  loadAll(): Promise<Database>
  /** 여러 변경을 한 번에 저장합니다. 하나라도 실패하면 모두 취소됩니다. */
  apply(changes: Change[]): Promise<void>
  /** 다른 기기에서 바뀐 내용이 오면 알려줍니다. (가족 공유만) 돌려주는 함수를 부르면 구독이 끝납니다. */
  subscribe?(listener: (db: Database) => void): () => void
}

export function emptyDatabase(): Database {
  return {
    children: [],
    academies: [],
    lessons: [],
    makeups: [],
    payments: [],
    notificationRules: [],
    subjects: [],
    studyTasks: [],
    studyWeeks: [],
  }
}

export function collectionNames(): CollectionName[] {
  return Object.keys(emptyDatabase()) as CollectionName[]
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

/** 모든 기록을 지우는 변경 목록 (복원에서 덮어쓸 때, 가족 공유에서 나올 때) */
export function allRemovalChanges(db: Database): Change[] {
  return collectionNames().flatMap((collection) =>
    (db[collection] as BaseRecord[]).map((record): Change => ({ type: 'remove', collection, id: record.id })),
  )
}

/** 모든 기록을 넣는 변경 목록 */
export function allPutChanges(db: Database): Change[] {
  return collectionNames().flatMap((collection) =>
    (db[collection] as BaseRecord[]).map((record) => ({ type: 'put', collection, item: record }) as Change),
  )
}
