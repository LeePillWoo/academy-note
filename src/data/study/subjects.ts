import { useMemo } from 'react'
import type { Weekday } from '../../utils/date'
import { useData } from '../DataProvider'
import { newId, nowIso } from '../id'
import type { Change, StudyTask, Subject } from '../types'
import { subjectRemovalChanges, tasksRemovalChanges } from './cascade'

/** 과목 화면에서 편집 중인 학습 내용 한 줄. id가 없으면 새로 넣는 것입니다. */
export interface TaskDraft {
  id?: string
  name: string
  weekdays: Weekday[]
}

export interface SubjectInput {
  id?: string
  childId: string
  name: string
  color: string
  /** 저장할 학습 내용 전부 (순서대로). 여기에 없는 기존 내용은 지웁니다. */
  tasks: TaskDraft[]
}

export const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

/** 한 자녀의 과목 목록(순서대로)과 과목을 바꾸는 기능 */
export function useSubjects(childId: string | null) {
  const { data, apply } = useData()
  const subjects = useMemo(
    () => data.subjects.filter((subject) => subject.childId === childId).sort(byOrder),
    [data.subjects, childId],
  )

  /** 과목과 학습 내용을 한 번에 저장합니다. 빠진 학습 내용은 체크 기록과 함께 지웁니다. */
  async function saveSubject(input: SubjectInput) {
    const now = nowIso()
    const existing = input.id ? data.subjects.find((subject) => subject.id === input.id) : undefined
    const subject: Subject = existing
      ? { ...existing, name: input.name, color: input.color, updatedAt: now }
      : {
          id: newId(),
          childId: input.childId,
          name: input.name,
          color: input.color,
          order: subjects.reduce((max, item) => Math.max(max, item.order), -1) + 1,
          createdAt: now,
          updatedAt: now,
        }
    const changes: Change[] = [{ type: 'put', collection: 'subjects', item: subject }]

    const existingTasks = data.studyTasks.filter((task) => task.subjectId === subject.id)
    input.tasks.forEach((draft, index) => {
      const previous = draft.id ? existingTasks.find((task) => task.id === draft.id) : undefined
      const item: StudyTask = previous
        ? { ...previous, name: draft.name, weekdays: draft.weekdays, order: index, updatedAt: now }
        : {
            id: newId(),
            subjectId: subject.id,
            name: draft.name,
            weekdays: draft.weekdays,
            order: index,
            createdAt: now,
            updatedAt: now,
          }
      changes.push({ type: 'put', collection: 'studyTasks', item })
    })
    const keptIds = new Set(input.tasks.map((draft) => draft.id))
    const removedIds = existingTasks.filter((task) => !keptIds.has(task.id)).map((task) => task.id)
    changes.push(...tasksRemovalChanges(data, removedIds, now))

    await apply(changes)
  }

  /** 과목을 지우면 학습 내용과 체크 기록도 함께 지웁니다. */
  async function removeSubject(id: string) {
    await apply(subjectRemovalChanges(data, id))
  }

  /** 순서를 한 칸 앞(-1)이나 뒤(+1)로 옮깁니다. */
  async function moveSubject(id: string, direction: -1 | 1) {
    const index = subjects.findIndex((subject) => subject.id === id)
    const neighbor = subjects[index + direction]
    if (index === -1 || !neighbor) return
    const current = subjects[index]
    const now = nowIso()
    await apply([
      { type: 'put', collection: 'subjects', item: { ...current, order: neighbor.order, updatedAt: now } },
      { type: 'put', collection: 'subjects', item: { ...neighbor, order: current.order, updatedAt: now } },
    ])
  }

  return { subjects, saveSubject, removeSubject, moveSubject }
}
