import { useMemo } from 'react'
import { useData } from '../DataProvider'
import type { StudyTask } from '../types'
import { byOrder } from './subjects'

/** 학습 내용 전체와, 과목별로 순서대로 꺼내는 기능 */
export function useTasks() {
  const { data } = useData()
  const bySubject = useMemo(() => {
    const map = new Map<string, StudyTask[]>()
    for (const task of data.studyTasks) {
      const list = map.get(task.subjectId)
      if (list) list.push(task)
      else map.set(task.subjectId, [task])
    }
    for (const list of map.values()) list.sort(byOrder)
    return map
  }, [data.studyTasks])

  function tasksOf(subjectId: string): StudyTask[] {
    return bySubject.get(subjectId) ?? []
  }

  return { tasks: data.studyTasks, tasksOf }
}
