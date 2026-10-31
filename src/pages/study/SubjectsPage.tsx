import { Link } from 'react-router'
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, PlusIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import { useChildren } from '../../data/children'
import { useStudyChild } from '../../data/study/studyChild'
import { useSubjects } from '../../data/study/subjects'
import { useTasks } from '../../data/study/tasks'
import type { Child } from '../../data/types'

/** 과목 목록. 누르면 수정하고, 화살표로 순서를 바꿉니다. 전체를 고르면 자녀마다 나눠서 보여줍니다. */
export default function SubjectsPage() {
  const { children } = useChildren()
  const child = useStudyChild()
  const shown = child ? [child] : children

  return (
    <section className="narrow">
      <PageHeader title="과목" subtitle={child ? `${child.name}의 과목과 학습 내용` : '자녀별 과목과 학습 내용'} backTo="/study" />
      {shown.length === 0 && (
        <div className="card">
          <p>자녀를 먼저 등록하세요. 과목은 자녀마다 따로 둡니다.</p>
          <Link to="/settings/children/new" className="btn btn-primary">
            <PlusIcon />
            자녀 등록하기
          </Link>
        </div>
      )}
      {shown.map((item) => (
        <SubjectList key={item.id} child={item} showName={!child} />
      ))}
    </section>
  )
}

function SubjectList({ child, showName }: { child: Child; showName: boolean }) {
  const { subjects, moveSubject } = useSubjects(child.id)
  const { tasksOf } = useTasks()

  function move(id: string, direction: -1 | 1) {
    moveSubject(id, direction).catch(() => window.alert('순서를 바꾸지 못했습니다. 다시 시도하세요.'))
  }

  return (
    <div className="home-section">
      {showName && (
        <h2 className="section-heading">
          <span className="dot" style={{ background: child.color }} />
          {child.name}
        </h2>
      )}
      {subjects.length === 0 ? (
        <div className="card">
          <p>등록된 과목이 없습니다.</p>
          <p className="muted">과목(예: 수학, 영어, 독서)을 만들고 그 아래에 매주 할 학습 내용을 넣으세요.</p>
        </div>
      ) : (
        <ul className="list">
          {subjects.map((subject, index) => {
            const count = tasksOf(subject.id).length
            return (
              <li key={subject.id} className="list-row">
                <Link to={`/study/subjects/${subject.id}`} className="list-main">
                  <span className="dot" style={{ background: subject.color }} />
                  <span className="list-text">
                    <span className="list-title">{subject.name}</span>
                    <span className="list-sub">{count === 0 ? '학습 내용 없음' : `학습 내용 ${count}개`}</span>
                  </span>
                  <ChevronRightIcon />
                </Link>
                <div className="row-actions">
                  <button type="button" className="icon-btn" onClick={() => move(subject.id, -1)}
                    disabled={index === 0} aria-label={`${subject.name} 앞으로`}>
                    <ArrowUpIcon />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => move(subject.id, 1)}
                    disabled={index === subjects.length - 1} aria-label={`${subject.name} 뒤로`}>
                    <ArrowDownIcon />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Link to={`/study/subjects/new?child=${child.id}`} className="btn btn-primary btn-block">
        <PlusIcon />
        {showName ? `${child.name} 과목 추가` : '과목 추가'}
      </Link>
      {subjects.length > 1 && <p className="muted hint">화살표로 순서를 바꾸면 보드에 보이는 순서도 바뀝니다.</p>}
    </div>
  )
}
