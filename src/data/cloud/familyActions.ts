import { createIndexedDbStorage } from '../indexedDbStorage'
import { allPutChanges, allRemovalChanges } from '../storage'
import type { Database } from '../types'
import { generateFamilyCode, getFamilyState, setFamilyState } from './family'
import { createFamilyInCloud, familyExists, mergeIntoFamily } from './firestoreStorage'

/**
 * 가족 공유 켜기/끄기. 끝나면 화면을 다시 불러와 저장소를 바꿉니다.
 * 혼자 쓰기 ↔ 가족 공유 전환은 자주 하는 일이 아니라서 단순하게 새로고침으로 처리합니다.
 */

/** 가족 코드를 새로 만들고 지금 폰의 데이터를 모두 올립니다. 돌려주는 값은 코드입니다. */
export async function createFamily(current: Database): Promise<string> {
  let code = generateFamilyCode()
  // 겹칠 확률은 사실상 0이지만 혹시 몰라 확인합니다.
  while (await familyExists(code)) code = generateFamilyCode()
  await createFamilyInCloud(code, current)
  setFamilyState(code)
  return code
}

export type JoinStrategy = 'replace' | 'merge'

/** 가족 코드로 참여합니다. replace: 가족 데이터로 바꿈(폰 데이터는 두고 안 씀) / merge: 내 데이터도 올려서 합침 */
export async function joinFamily(code: string, strategy: JoinStrategy, current: Database): Promise<{ merged: number }> {
  if (!(await familyExists(code))) throw new Error('이 코드의 가족을 찾지 못했습니다. 코드를 다시 확인하세요.')
  const merged = strategy === 'merge' ? await mergeIntoFamily(code, current) : 0
  setFamilyState(code)
  return { merged }
}

/** 가족 공유를 끄고 혼자 쓰기로 돌아갑니다. copy가 true면 지금 보이는 가족 데이터를 폰에 복사해 둡니다. */
export async function leaveFamily(current: Database, copy: boolean): Promise<void> {
  if (copy) {
    const local = await createIndexedDbStorage()
    const existing = await local.loadAll()
    await local.apply([...allRemovalChanges(existing), ...allPutChanges(current)])
  }
  setFamilyState(null)
}

export { getFamilyState }
