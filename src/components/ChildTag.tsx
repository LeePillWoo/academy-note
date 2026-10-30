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
