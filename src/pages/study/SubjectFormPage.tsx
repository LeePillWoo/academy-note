import { useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import ColorPicker from '../../components/ColorPicker'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '../../components/icons'
import PageHeader from '../../components/PageHeader'
import WeekdayPicker from '../../components/study/WeekdayPicker'
import { nextUnusedColor } from '../../data/colors'
import { useData } from '../../data/DataProvider'
import { newId } from '../../data/id'
import { useStudyChild } from '../../data/study/studyChild'
import { byOrder, useSubjects } from '../../data/study/subjects'
import { useGoBack } from '../../hooks/useGoBack'
import { WEEKDAYS, type Weekday } from '../../utils/date'
import { objectParticle } from '../../utils/korean'

// 주소를 직접 열어 이전 화면이 없을 때 돌아갈 곳
const BACK_PATH = '/study'

/** 편집 중인 학습 내용 한 줄. key는 화면에서만 쓰는 고유값입니다. */
interface TaskItem {
  key: string
  id?: string
  name: string
  weekdays: Weekday[]
}

function newTaskItem(): TaskItem {
  return { key: newId(), name: '', weekdays: WEEKDAYS }
}

/** 과목 추가(/study/subjects/new?child=자녀)와 수정(/study/subjects/:subjectId) 화면 */
export default function SubjectFormPage() {
  const { subjectId } = useParams()
  // 다른 과목으로 바뀌면 입력값을 새로 채우도록 key를 바꿉니다.
  return <SubjectForm key={subjectId ?? 'new'} subjectId={subjectId} />
}

function SubjectForm({ subjectId }: { subjectId?: string }) {
  const { data } = useData()
  const studyChild = useStudyChild()
  const [searchParams] = useSearchParams()
  const goBack = useGoBack(BACK_PATH)
  // 처음 연 때의 과목을 기억합니다. 삭제 직후 화면을 떠나기 전에 "찾는 과목이 없습니다"가 잠깐 보이지 않게 하기 위해서입니다.
  const [original] = useState(() => (subjectId ? data.subjects.find((subject) => subject.id === subjectId) : undefined))
  // 새 과목은 보드에서 넘겨준 자녀(?child=), 없으면 위쪽에서 고른 자녀
  const childId = original?.childId ?? searchParams.get('child') ?? studyChild?.id
  const child = data.children.find((item) => item.id === childId)
  const { subjects, saveSubject, removeSubject } = useSubjects(child?.id ?? null)
  const [name, setName] = useState(original?.name ?? '')
  const [color, setColor] = useState(() => original?.color ?? nextUnusedColor(subjects.map((subject) => subject.color)))
  const [tasks, setTasks] = useState<TaskItem[]>(() =>
    original
      ? data.studyTasks
          .filter((task) => task.subjectId === original.id)
          .sort(byOrder)
          .map((task) => ({ key: task.id, id: task.id, name: task.name, weekdays: task.weekdays }))
      : [newTaskItem()],
  )
  // 방금 추가한 줄에 커서를 둡니다.
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [nameError, setNameError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  if (subjectId && !original) {
    return (
      <section className="narrow">
        <PageHeader title="과목" backTo={BACK_PATH} />
        <div className="card">
          <p>찾는 과목이 없습니다. 이미 삭제되었을 수 있습니다.</p>
        </div>
      </section>
    )
  }

  if (!child) {
    return (
      <section className="narrow">
        <PageHeader title="과목 추가" backTo={BACK_PATH} />
        <div className="card">
          {data.children.length === 0 ? (
            <>
              <p>자녀를 먼저 등록하세요. 과목은 자녀마다 따로 둡니다.</p>
              <Link to="/settings/children/new" className="btn btn-primary">
                <PlusIcon />
                자녀 등록하기
              </Link>
            </>
          ) : (
            <p>위쪽에서 과목을 추가할 자녀를 고르세요. 과목은 자녀마다 따로 둡니다.</p>
          )}
        </div>
      </section>
    )
  }

  function updateTask(key: string, patch: Partial<TaskItem>) {
    setTasks((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function addTask() {
    const item = newTaskItem()
    setTasks((items) => [...items, item])
    setFocusKey(item.key)
  }

  function removeTask(key: string) {
    setTasks((items) => items.filter((item) => item.key !== key))
  }

  function moveTask(key: string, direction: -1 | 1) {
    setTasks((items) => {
      const index = items.findIndex((item) => item.key === key)
      const target = index + direction
      if (index === -1 || target < 0 || target >= items.length) return items
      const next = [...items]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('과목 이름을 입력하세요.')
      return
    }
    setBusy(true)
    try {
      await saveSubject({
        id: original?.id,
        childId: child!.id,
        name: trimmed,
        color,
        // 이름이 빈 줄은 저장하지 않습니다.
        tasks: tasks
          .map((item) => ({ id: item.id, name: item.name.trim(), weekdays: item.weekdays }))
          .filter((item) => item.name),
      })
      goBack()
    } catch {
      setFormError('저장하지 못했습니다. 다시 시도하세요.')
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!original) return
    const message = `'${original.name}'${objectParticle(original.name)} 삭제할까요?\n학습 내용과 체크 기록도 함께 지워지며 되돌릴 수 없습니다.`
    if (!window.confirm(message)) return
    setBusy(true)
    try {
      await removeSubject(original.id)
      goBack()
    } catch {
      setFormError('삭제하지 못했습니다. 다시 시도하세요.')
      setBusy(false)
    }
  }

  return (
    <section className="narrow">
      <PageHeader title={original ? '과목 수정' : '과목 추가'} subtitle={`${child.name}의 과목`} backTo={BACK_PATH} />
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="card form-section">
          <div className="field">
            <label className="field-label" htmlFor="subject-name">과목 이름</label>
            <input
              id="subject-name"
              className="input"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setNameError('')
              }}
              maxLength={20}
              placeholder="예: 수학, 영어, 독서"
              autoComplete="off"
              enterKeyHint="next"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'subject-name-error' : undefined}
            />
            {nameError && <p id="subject-name-error" className="field-error">{nameError}</p>}
          </div>

          <fieldset className="field">
            <legend className="field-label">표시 색상</legend>
            <ColorPicker name="subject-color" value={color} onChange={setColor} />
            <p className="muted">보드에서 이 과목의 줄과 체크 표시에 쓰는 색입니다.</p>
          </fieldset>
        </div>

        <div className="card form-section">
          <h2 className="section-title">학습 내용</h2>
          <p className="muted">매주 반복하는 학습 내용과 계획한 요일을 넣으세요. 계획하지 않은 요일에도 체크할 수는 있습니다.</p>

          {tasks.map((item, index) => {
            const label = `학습 내용 ${index + 1}`
            return (
              <div key={item.key} className="task-editor">
                <div className="task-editor-head">
                  <input
                    className="input"
                    value={item.name}
                    onChange={(event) => updateTask(item.key, { name: event.target.value })}
                    maxLength={30}
                    placeholder="예: 문제집 2쪽, 영어 단어 20개"
                    autoComplete="off"
                    enterKeyHint="done"
                    aria-label={`${label} 이름`}
                    autoFocus={item.key === focusKey}
                  />
                  <button type="button" className="icon-btn" onClick={() => moveTask(item.key, -1)} disabled={index === 0}
                    aria-label={`${label} 위로`}>
                    <ArrowUpIcon />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => moveTask(item.key, 1)}
                    disabled={index === tasks.length - 1} aria-label={`${label} 아래로`}>
                    <ArrowDownIcon />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => removeTask(item.key)} aria-label={`${label} 삭제`}>
                    <TrashIcon />
                  </button>
                </div>
                <WeekdayPicker label={label} value={item.weekdays} onChange={(weekdays) => updateTask(item.key, { weekdays })} />
              </div>
            )
          })}

          <button type="button" className="btn btn-secondary btn-small" onClick={addTask}>
            <PlusIcon />
            학습 내용 추가
          </button>
          <p className="muted">이름이 빈 줄은 저장하지 않습니다. 학습 내용을 지우면 그 체크 기록도 지워집니다.</p>
        </div>

        {formError && <p className="field-error" role="alert">{formError}</p>}

        <div className="sticky-actions">
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={goBack} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              저장
            </button>
          </div>
        </div>
      </form>

      {original && (
        <button type="button" className="btn btn-danger btn-block delete-btn" onClick={handleDelete} disabled={busy}>
          과목 삭제
        </button>
      )}
    </section>
  )
}
