import { useMemo } from 'react'
import { normalizePeriods } from './academyRules'
import { useData } from './DataProvider'
import { newId, nowIso } from './id'
import type { Academy } from './types'

/** 학원을 저장할 때 화면에서 넘기는 내용 (id가 없으면 새 학원) */
export type AcademyInput = Omit<Academy, 'id' | 'createdAt' | 'updatedAt' | 'order'> & { id?: string }

/** 학원 목록(자녀 순서, 학원 순서대로)과 학원을 바꾸는 기능 */
export function useAcademies() {
  const { data, apply } = useData()

  const academies = useMemo(() => {
    const childOrder = new Map(data.children.map((child) => [child.id, child.order]))
    return [...data.academies].sort(
      (a, b) => (childOrder.get(a.childId) ?? 0) - (childOrder.get(b.childId) ?? 0) || a.order - b.order,
    )
  }, [data.children, data.academies])

  async function saveAcademy(input: AcademyInput) {
    const now = nowIso()
    const existing = input.id ? academies.find((academy) => academy.id === input.id) : undefined
    const { id: _id, ...fields } = input
    const item: Academy = {
      ...fields,
      schedules: normalizePeriods(input.schedules, input.startedOn),
      fees: normalizePeriods(input.fees, input.startedOn),
      id: existing?.id ?? newId(),
      order: existing?.order ?? academies.reduce((max, academy) => Math.max(max, academy.order), -1) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await apply([{ type: 'put', collection: 'academies', item }])
    return item
  }

  // 1-3 이후에는 학원을 지울 때 그 학원의 수업 기록, 보강, 납부도 함께 지우도록 바꿉니다.
  async function removeAcademy(id: string) {
    await apply([{ type: 'remove', collection: 'academies', id }])
  }

  return { academies, saveAcademy, removeAcademy }
}
