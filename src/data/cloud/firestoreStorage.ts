import { allPutChanges, emptyDatabase, type DataStorage } from '../storage'
import type { BaseRecord, Change, CollectionName, Database } from '../types'
import { getFirebaseConfig } from './config'

/** Firestore에 저장하는 문서 하나 = 기록 하나. 경로: families/{가족 코드}/records/{종류__id} */
interface StoredRecord {
  collection: string
  id: string
  value: unknown
  updatedAt: string
}

type FirestoreModule = typeof import('firebase/firestore')

interface Connection {
  fs: FirestoreModule
  db: import('firebase/firestore').Firestore
}

let connection: Promise<Connection> | undefined

/** 처음 쓸 때만 Firebase를 불러와(코드 분할) 연결하고 익명으로 로그인합니다. 혼자 쓰기에서는 절대 불리지 않습니다. */
export function connect(): Promise<Connection> {
  connection ??= (async () => {
    const config = getFirebaseConfig()
    if (!config) throw new Error('가족 공유 연결 설정(Firebase)이 없습니다. 설정 > 가족 공유에서 넣어 주세요.')
    const [{ initializeApp, getApps, getApp }, { getAuth, signInAnonymously }, fs] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ])
    const app = getApps().length ? getApp() : initializeApp(config)
    let db: import('firebase/firestore').Firestore
    try {
      db = fs.initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        // 오프라인에서도 읽고 쓰고, 연결되면 맞춥니다.
        localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
      })
    } catch {
      db = fs.getFirestore(app)
    }
    const auth = getAuth(app)
    if (!auth.currentUser) await withTimeout(signInAnonymously(auth), '로그인(익명)에 시간이 오래 걸립니다. 인터넷 연결을 확인하세요.')
    return { fs, db }
  })()
  connection.catch(() => {
    // 실패하면 다음에 다시 시도할 수 있게 합니다.
    connection = undefined
  })
  return connection
}

function withTimeout<T>(promise: Promise<T>, message: string, ms = 20_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function toDatabase(docs: { data(): unknown }[]): Database {
  const data = emptyDatabase()
  for (const snapshot of docs) {
    const record = snapshot.data() as Partial<StoredRecord> | undefined
    if (!record || typeof record.collection !== 'string' || !(record.collection in data)) continue
    if (typeof record.value !== 'object' || record.value === null) continue
    ;(data[record.collection as CollectionName] as unknown[]).push(record.value)
  }
  return data
}

function docId(change: Change): string {
  return `${change.collection}__${change.type === 'put' ? change.item.id : change.id}`
}

/** 동기화 중 생긴 오류를 화면(가족 공유 설정)에 알립니다. */
export function reportCloudError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[가족 공유]', message)
  window.dispatchEvent(new CustomEvent('academy-note:cloud-error', { detail: message }))
}

/** 가족 공유 저장소. 다른 기기의 변경은 subscribe로 받습니다. */
export function createFirestoreStorage(familyId: string): DataStorage {
  const listeners = new Set<(db: Database) => void>()
  let firstLoad: Promise<Database> | undefined

  async function records() {
    const { fs, db } = await connect()
    return { fs, db, ref: fs.collection(db, 'families', familyId, 'records') }
  }

  function startListening(): Promise<Database> {
    firstLoad ??= new Promise((resolve, reject) => {
      records()
        .then(({ fs, ref }) => {
          fs.onSnapshot(
            ref,
            (snapshot) => {
              const data = toDatabase(snapshot.docs)
              resolve(data)
              listeners.forEach((listener) => listener(data))
            },
            (error) => {
              reportCloudError(error)
              reject(error)
            },
          )
        })
        .catch(reject)
    })
    return firstLoad
  }

  return {
    loadAll: () => startListening(),

    async apply(changes) {
      const { fs, db, ref } = await records()
      // 오프라인이면 서버 확인이 올 때까지 기다리지 않습니다. 폰에 먼저 저장되고 연결되면 보내집니다.
      for (const group of chunk(changes, 400)) {
        const batch = fs.writeBatch(db)
        for (const change of group) {
          const target = fs.doc(ref, docId(change))
          if (change.type === 'put') {
            const stored: StoredRecord = { collection: change.collection, id: change.item.id, value: change.item, updatedAt: change.item.updatedAt }
            batch.set(target, stored)
          } else {
            batch.delete(target)
          }
        }
        batch.commit().catch(reportCloudError)
      }
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size))
  return groups
}

// ── 가족 만들기 / 참여 / 데이터 가져오기 (온라인 필요, 서버 확인까지 기다림) ──

export async function familyExists(familyId: string): Promise<boolean> {
  const { fs, db } = await connect()
  const snapshot = await withTimeout(fs.getDoc(fs.doc(db, 'families', familyId)), '가족 코드를 확인하는 데 시간이 오래 걸립니다. 인터넷 연결을 확인하세요.')
  return snapshot.exists()
}

/** 가족 공간을 만들고 지금 데이터를 모두 올립니다. */
export async function createFamilyInCloud(familyId: string, data: Database): Promise<void> {
  const { fs, db } = await connect()
  await withTimeout(
    fs.setDoc(fs.doc(db, 'families', familyId), { app: 'academy-note', version: 1, createdAt: fs.serverTimestamp() }),
    '가족 공간을 만드는 데 시간이 오래 걸립니다. 인터넷 연결을 확인하세요.',
  )
  await uploadRecords(familyId, allPutChanges(data).filter((change): change is Extract<Change, { type: 'put' }> => change.type === 'put'))
}

/** 가족 공간의 모든 기록을 서버에서 한 번 읽어 옵니다. */
export async function fetchFamilyData(familyId: string): Promise<Database> {
  const { fs, db } = await connect()
  const snapshot = await withTimeout(fs.getDocs(fs.collection(db, 'families', familyId, 'records')), '가족 데이터를 읽는 데 시간이 오래 걸립니다.')
  return toDatabase(snapshot.docs)
}

/** 내 기록 중 가족 공간에 없거나 내 것이 더 최신인 것만 올립니다. (참여할 때 합치기) */
export async function mergeIntoFamily(familyId: string, data: Database): Promise<number> {
  const remote = await fetchFamilyData(familyId)
  const remoteUpdated = new Map<string, string>()
  for (const collection of Object.keys(remote) as CollectionName[]) {
    for (const record of remote[collection] as BaseRecord[]) remoteUpdated.set(`${collection}__${record.id}`, record.updatedAt)
  }
  const puts = allPutChanges(data).filter((change): change is Extract<Change, { type: 'put' }> => {
    if (change.type !== 'put') return false
    const existing = remoteUpdated.get(`${change.collection}__${change.item.id}`)
    return existing === undefined || change.item.updatedAt > existing
  })
  await uploadRecords(familyId, puts)
  return puts.length
}

async function uploadRecords(familyId: string, puts: Extract<Change, { type: 'put' }>[]): Promise<void> {
  const { fs, db } = await connect()
  const ref = fs.collection(db, 'families', familyId, 'records')
  for (const group of chunk(puts, 400)) {
    const batch = fs.writeBatch(db)
    for (const change of group) {
      const stored: StoredRecord = { collection: change.collection, id: change.item.id, value: change.item, updatedAt: change.item.updatedAt }
      batch.set(fs.doc(ref, `${change.collection}__${change.item.id}`), stored)
    }
    await withTimeout(batch.commit(), '데이터를 올리는 데 시간이 오래 걸립니다. 인터넷 연결을 확인하세요.', 60_000)
  }
}
