import type { Subject, StudyTask } from '../../data/types'
import type { Progress } from '../../data/study/weekStats'
import type { DateStr } from '../../utils/date'

/**
 * 보기 방식
 * - days = 요일별 (기본): 왼쪽 요일, 위 과목, 칸 안에 그날 학습 내용
 * - plan = 계획표: 요일별의 요일과 과목 위치를 바꾼 것. 왼쪽 과목, 위 요일
 * - check = 체크표: 학습 내용 줄마다 월~일 체크 칸 7개
 */
export type BoardView = 'plan' | 'days' | 'check'

/** 체크표와 계획표가 함께 받는 값 */
export interface BoardTableProps {
  subjects: Subject[]
  tasksOf(subjectId: string): StudyTask[]
  /** 월~일 7일 */
  dates: DateStr[]
  todayStr: DateStr
  isDone(taskId: string, date: DateStr): boolean
  onToggle(taskId: string, date: DateStr): void
  /** 요일마다 완료/계획 수. 학습 내용이 하나도 없으면 null (아래 줄을 그리지 않음) */
  dayTotals: Progress[] | null
}
