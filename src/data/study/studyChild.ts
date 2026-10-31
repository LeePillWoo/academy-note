import { useChildren } from '../children'
import { useSelectedChild } from '../SelectedChild'
import type { Child } from '../types'

/**
 * 학습 화면에서 볼 자녀. 학습 보드는 늘 한 자녀 것만 보여줍니다.
 * 위쪽에서 고른 자녀, 자녀가 한 명뿐이면 그 자녀입니다. 전체(자녀 2명 이상)면 null
 */
export function useStudyChild(): Child | null {
  const { children } = useChildren()
  const { selectedChild } = useSelectedChild()
  return selectedChild ?? (children.length === 1 ? children[0] : null)
}
