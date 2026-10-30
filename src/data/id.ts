/**
 * 기록마다 붙는 고유 번호를 만듭니다.
 * crypto.randomUUID는 http 주소(같은 와이파이로 폰 테스트)에서 쓸 수 없어서 getRandomValues로 만듭니다.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function nowIso(): string {
  return new Date().toISOString()
}
