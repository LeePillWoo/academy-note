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

  /** 자녀를 지우면 그 자녀의 학원도 함께 지웁니다. */
  async function removeChild(id: string) {
    const academyIds = data.academies.filter((academy) => academy.childId === id).map((academy) => academy.id)
    await apply([
      ...academyIds.map((academyId) => ({ type: 'remove' as const, collection: 'academies' as const, id: academyId })),
      { type: 'remove', collection: 'children', id },
    ])
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
