import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { softColorVars } from '../../data/colors'
import { useData } from '../../data/DataProvider'
import { useChecks } from '../../data/study/checks'
import { byOrder } from '../../data/study/subjects'
import { studyItemsOn } from '../../data/study/summary'
import { useTasks } from '../../data/study/tasks'
import { cellState } from '../../data/study/weekStats'
import type { Child } from '../../data/types'
import type { DateStr } from '../../utils/date'
import PlanItem from './PlanItem'

/**
 * 홈의 '오늘 학습': 보이는 자녀(위쪽 선택, 전체면 모두)의 오늘 할 학습 내용. 눌러서 바로 체크합니다.
 * 학습 계획이 하나도 없으면 학습 화면으로 가는 안내만 보입니다.
 */
export default function TodayStudy({ shownChildren, todayStr }: { shownChildren: Child[]; todayStr: DateStr }) {
  const { data } = useData()
  const { tasksOf } = useTasks()
  const { isDone, toggleCheck } = useChecks()
  const [error, setError] = useState('')

  const groups = shownChildren
    .map((child) => {
      const subjects = data.subjects.filter((subject) => subject.childId === child.id).sort(byOrder)
      // 과목이 하나라도 있으면 보여줍니다. (학습 내용이 없는 과목은 과목 자체가 체크 대상)
      return { child, hasTasks: subjects.length > 0, items: studyItemsOn(subjects, tasksOf, todayStr, isDone) }
    })
    .filter((group) => group.hasTasks)
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)
  const done = groups.reduce((sum, group) => sum + group.items.filter((item) => item.done).length, 0)

  async function toggle(itemId: string) {
    try {
      setError('')
      await toggleCheck(itemId, todayStr)
    } catch {
      setError('저장하지 못했습니다. 다시 시도하세요.')
    }
  }

  return (
    <div className="home-section">
      <h2 className="section-heading">
        오늘 학습 {total > 0 && <span className="muted">{done}/{total}</span>}
      </h2>
      {groups.length === 0 ? (
        <div className="card">
          <p className="muted">학습 계획이 없습니다. 과목과 학습 내용을 넣으면 요일마다 체크할 수 있습니다.</p>
        </div>
      ) : (
        <div className="card study-today">
          {groups.map(({ child, items }) => (
            <div key={child.id}>
              {groups.length > 1 && (
                <h3 className="study-today-child">
                  <span className="dot" style={{ background: child.color }} />
                  {child.name}
                  <span className="muted">
                    {items.filter((item) => item.done).length}/{items.length}
                  </span>
                </h3>
              )}
              {items.length === 0 ? (
                <p className="muted">오늘 계획한 학습이 없습니다.</p>
              ) : (
                <ul className="study-today-list">
                  {items.map(({ item, subject, done: checked }) => (
                    <li key={item.id} style={softColorVars(subject.color) as CSSProperties}>
                      <PlanItem item={item} date={todayStr} isToday
                        state={cellState(item, todayStr, checked, todayStr)} onToggle={() => toggle(item.id)} />
                      {/* 학습 내용이 없는 과목은 이름이 곧 과목이라 꼬리표를 또 달지 않습니다 */}
                      {item.id !== subject.id && <span className="study-today-subject">{subject.name}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {error && <p className="field-error" role="alert">{error}</p>}
        </div>
      )}
      <Link to="/study" className="section-link">
        {groups.length === 0 ? '학습 계획 만들기' : '학습 보드 열기'}
      </Link>
    </div>
  )
}
