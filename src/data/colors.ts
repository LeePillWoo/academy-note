/** 자녀와 학원의 표시 색상. 앱의 남색과 어울리고, 밝은 화면과 어두운 화면에서 모두 잘 보이는 색입니다. */
export const PALETTE = [
  { name: '남색', value: '#6366f1' },
  { name: '분홍', value: '#ec4899' },
  { name: '초록', value: '#10b981' },
  { name: '주황', value: '#f59e0b' },
  { name: '하늘', value: '#0ea5e9' },
  { name: '보라', value: '#a855f7' },
  { name: '빨강', value: '#ef4444' },
  { name: '청록', value: '#14b8a6' },
] as const

function rgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number]
}

/** 색을 흰색(amount > 0)이나 검정(amount < 0) 쪽으로 섞습니다. */
function mix(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0
  const ratio = Math.abs(amount)
  return `rgb(${rgb(hex).map((c) => Math.round(c + (target - c) * ratio)).join(' ')})`
}

/**
 * 칩에 쓰는 옅은 색 값: 옅은 바탕(--chip-bg), 테두리(--chip-border), 진한 글자(--chip-fg).
 */
export function softColorVars(hex: string): Record<string, string> {
  const [r, g, b] = rgb(hex)
  return {
    '--chip-bg': `rgb(${r} ${g} ${b} / 0.14)`,
    '--chip-border': `rgb(${r} ${g} ${b} / 0.28)`,
    '--chip-fg': mix(hex, -0.35),
  }
}

/** 아직 쓰지 않은 첫 번째 색을 고릅니다. 모두 쓰였으면 첫 색을 고릅니다. */
export function nextUnusedColor(usedColors: string[]): string {
  return PALETTE.find((color) => !usedColors.includes(color.value))?.value ?? PALETTE[0].value
}
