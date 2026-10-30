import { useMemo } from 'react'
import { useData } from './DataProvider'
import { newId, nowIso } from './id'
import type { Child } from './types'

export interface ChildInput {
  id?: string
  name: string
  color: string
}

/** 자녀 목록(순서대로)과 자녀를 바꾸는 기능 */
export function useChildren() {
  const { data, apply } = useData()
  const children = useMemo(() => [...data.children].sort((a, b) => a.order - b.order), [data.children])

  async function saveChild(input: ChildInput) {
    const now = nowIso()
    const existing = input.id ? children.find((child) => child.id === input.id) : undefined
    const item: Child = existing
      ? { ...existing, name: input.name, color: input.color, updatedAt: now }
      : {
          id: newId(),
          name: input.name,
          color: input.color,
          order: children.reduce((max, child) => Math.max(max, child.order), -1) + 1,
          createdAt: now,
          updatedAt: now,
        }
    await apply([{ type: 'put', collection: 'children', item }])
  }

  // 1-2에서 학원이 생기면, 자녀를 지울 때 그 자녀의 학원도 함께 지우도록 바꿉니다.
  async function removeChild(id: string) {
    await apply([{ type: 'remove', collection: 'children', id }])
  }

  /** 순서를 한 칸 앞(-1)이나 뒤(+1)로 옮깁니다. */
  async function moveChild(id: string, direction: -1 | 1) {
    const index = children.findIndex((child) => child.id === id)
    const neighbor = children[index + direction]
    if (index === -1 || !neighbor) return
    const current = children[index]
    const now = nowIso()
    await apply([
      { type: 'put', collection: 'children', item: { ...current, order: neighbor.order, updatedAt: now } },
      { type: 'put', collection: 'children', item: { ...neighbor, order: current.order, updatedAt: now } },
    ])
  }

  return { children, saveChild, removeChild, moveChild }
}
