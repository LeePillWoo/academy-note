/** 자녀와 학원의 표시 색상. 밝은 화면과 어두운 화면에서 모두 잘 보이는 색입니다. */
export const PALETTE = [
  { name: '파랑', value: '#3b82f6' },
  { name: '빨강', value: '#ef4444' },
  { name: '초록', value: '#22c55e' },
  { name: '주황', value: '#f97316' },
  { name: '보라', value: '#a855f7' },
  { name: '분홍', value: '#ec4899' },
  { name: '청록', value: '#14b8a6' },
  { name: '노랑', value: '#eab308' },
] as const

/** 아직 쓰지 않은 첫 번째 색을 고릅니다. 모두 쓰였으면 첫 색을 고릅니다. */
export function nextUnusedColor(usedColors: string[]): string {
  return PALETTE.find((color) => !usedColors.includes(color.value))?.value ?? PALETTE[0].value
}
