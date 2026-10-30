import { openDB } from 'idb'
import { emptyDatabase, type DataStorage } from './storage'
import type { CollectionName } from './types'

const DB_NAME = 'academy-note'
const STORE = 'records'

// 모든 종류를 한 저장 공간에 [종류, id]를 열쇠로 넣습니다. 새 종류를 추가해도 저장 구조를 바꾸지 않아도 됩니다.
interface StoredRecord {
  collection: CollectionName
  id: string
  value: unknown
}

export async function createIndexedDbStorage(): Promise<DataStorage> {
  const db = await openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore(STORE, { keyPath: ['collection', 'id'] })
    },
  })
  await requestPersistence()

  return {
    async loadAll() {
      const data = emptyDatabase()
      const rows = (await db.getAll(STORE)) as StoredRecord[]
      for (const row of rows) {
        // 지금 버전이 모르는 종류는 건너뜁니다.
        if (row.collection in data) (data[row.collection] as unknown[]).push(row.value)
      }
      return data
    },

    async apply(changes) {
      const tx = db.transaction(STORE, 'readwrite')
      await Promise.all([
        ...changes.map((change) =>
          change.type === 'put'
            ? tx.store.put({ collection: change.collection, id: change.item.id, value: change.item } satisfies StoredRecord)
            : tx.store.delete([change.collection, change.id]),
        ),
        tx.done,
      ])
    },
  }
}

// 브라우저가 저장 공간이 부족할 때 데이터를 지우지 않도록 요청합니다.
// http 주소(같은 와이파이로 폰 테스트)에서는 이 기능이 없으므로 건너뜁니다.
async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    // 요청이 거절되어도 저장은 그대로 됩니다.
  }
}
