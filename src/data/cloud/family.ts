/**
 * 가족 공유의 "가족 코드"와 모드 저장.
 * 코드는 헷갈리는 글자(0/O, 1/I)를 뺀 32가지 글자 12자라서 추측해서 맞출 수 없습니다. (약 10^18 가지)
 * 코드를 아는 사람은 누구나 그 가족의 데이터를 보고 고칠 수 있으므로 열쇠처럼 다룹니다.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const FAMILY_CODE_LENGTH = 12
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{12}$/

const FAMILY_KEY = 'academy-note:family-id'

export function generateFamilyCode(randomBytes: (length: number) => Uint8Array = defaultRandom): string {
  const bytes = randomBytes(FAMILY_CODE_LENGTH)
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

function defaultRandom(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/** 보여줄 때: XXXX-XXXX-XXXX */
export function formatFamilyCode(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') ?? code
}

/** 입력한 코드를 정리해서 돌려줍니다. 대소문자·공백·하이픈은 무시하고, 올바르지 않으면 null */
export function normalizeFamilyCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return CODE_PATTERN.test(code) ? code : null
}

/** 지금 이 기기가 참여 중인 가족. null이면 혼자 쓰기 */
export function getFamilyState(): { id: string } | null {
  const id = localStorage.getItem(FAMILY_KEY)
  return id && CODE_PATTERN.test(id) ? { id } : null
}

export function setFamilyState(id: string | null) {
  if (id) localStorage.setItem(FAMILY_KEY, id)
  else localStorage.removeItem(FAMILY_KEY)
}
