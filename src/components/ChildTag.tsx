import type { Child } from '../data/types'

/** 자녀 태그: 자녀 색 점과 이름. 전체 보기에서 어느 아이 것인지 보여줍니다. */
export default function ChildTag({ child }: { child: Child }) {
  return (
    <span className="child-tag">
      <span className="dot" style={{ background: child.color }} />
      {child.name}
    </span>
  )
}

/** 배경색 위에서 잘 읽히는 글자색 (밝은 배경엔 검정, 어두운 배경엔 흰색) */
export function readableTextColor(hex: string): string {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.45 ? '#111827' : '#ffffff'
}
