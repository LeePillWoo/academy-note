/** 모든 기록에 공통으로 들어가는 항목입니다. updatedAt은 백업을 합칠 때 더 최근 기록을 고르는 데 씁니다. */
export interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Child extends BaseRecord {
  name: string
  color: string
  /** 화면에 보이는 순서 (작을수록 앞) */
  order: number
}

/** 저장하는 데이터 종류입니다. 학원, 납부 같은 새 종류는 여기에 추가합니다. */
export interface Collections {
  children: Child
}

export type CollectionName = keyof Collections

export type Database = { [K in CollectionName]: Collections[K][] }

/** 저장소에 보내는 변경 하나. 여러 개를 묶어 한 번에 저장합니다. */
export type Change =
  | { [K in CollectionName]: { type: 'put'; collection: K; item: Collections[K] } }[CollectionName]
  | { type: 'remove'; collection: CollectionName; id: string }
