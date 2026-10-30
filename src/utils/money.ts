/** 금액을 쉼표로 나눠 보여줍니다. 예: 250000 → '250,000' */
export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR')
}

/**
 * 금액을 읽기 쉽게 보여줍니다.
 * 예: 250000 → '25만 원', 255000 → '25만 5,000원', 8000 → '8,000원', 0 → '0원'
 */
export function formatWon(value: number): string {
  const man = Math.floor(value / 10_000)
  const rest = value % 10_000
  if (man === 0) return `${formatNumber(rest)}원`
  if (rest === 0) return `${formatNumber(man)}만 원`
  return `${formatNumber(man)}만 ${formatNumber(rest)}원`
}

/** 입력한 글자에서 숫자만 남깁니다. 숫자가 없으면 null. 예: '25만0,000' → 250000 같은 오타는 고려하지 않습니다. */
export function parseAmount(text: string): number | null {
  const digits = text.replace(/[^\d]/g, '')
  if (!digits) return null
  return Number(digits)
}
