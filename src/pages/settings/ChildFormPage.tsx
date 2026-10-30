import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import ColorPicker from '../../components/ColorPicker'
import PageHeader from '../../components/PageHeader'
import { useChildren } from '../../data/children'
import { nextUnusedColor } from '../../data/colors'
import { useGoBack } from '../../hooks/useGoBack'
import { objectParticle } from '../../utils/korean'

const LIST_PATH = '/settings/children'

/** 자녀 추가(/settings/children/new)와 수정(/settings/children/:childId) 화면 */
export default function ChildFormPage() {
  const { childId } = useParams()
  // 다른 자녀로 바뀌면 입력값을 새로 채우도록 key를 바꿉니다.
  return <ChildForm key={childId ?? 'new'} childId={childId} />
}

function ChildForm({ childId }: { childId?: string }) {
  const { children, saveChild, removeChild } = useChildren()
  const goBack = useGoBack(LIST_PATH)
  // 처음 연 때의 자녀를 기억합니다. 삭제 직후 화면을 떠나기 전에 "찾는 자녀가 없습니다"가 잠깐 보이지 않게 하기 위해서입니다.
  const [original] = useState(() => (childId ? children.find((child) => child.id === childId) : undefined))
  const [name, setName] = useState(original?.name ?? '')
  const [color, setColor] = useState(() => original?.color ?? nextUnusedColor(children.map((child) => child.color)))
  const [nameError, setNameError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  if (childId && !original) {
    return (
      <section className="narrow">
        <PageHeader title="자녀" backTo={LIST_PATH} />
        <div className="card">
          <p>찾는 자녀가 없습니다. 이미 삭제되었을 수 있습니다.</p>
        </div>
      </section>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('이름을 입력하세요.')
      return
    }
    setBusy(true)
    try {
      await saveChild({ id: original?.id, name: trimmed, color })
      goBack()
    } catch {
      setFormError('저장하지 못했습니다. 다시 시도하세요.')
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!original) return
    const message = `'${original.name}'${objectParticle(original.name)} 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`
    if (!window.confirm(message)) return
    setBusy(true)
    try {
      await removeChild(original.id)
      goBack()
    } catch {
      setFormError('삭제하지 못했습니다. 다시 시도하세요.')
      setBusy(false)
    }
  }

  return (
    <section className="narrow">
      <PageHeader title={original ? '자녀 수정' : '자녀 추가'} backTo={LIST_PATH} />
      <form className="card form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="child-name">이름</label>
          <input
            id="child-name"
            className="input"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setNameError('')
            }}
            maxLength={20}
            placeholder="예: 첫째, 민준"
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'child-name-error' : undefined}
          />
          {nameError && <p id="child-name-error" className="field-error">{nameError}</p>}
        </div>

        <fieldset className="field">
          <legend className="field-label">표시 색상</legend>
          <ColorPicker name="child-color" value={color} onChange={setColor} />
          <p className="muted">전체 화면에서 자녀를 구분하는 색입니다.</p>
        </fieldset>

        {formError && <p className="field-error" role="alert">{formError}</p>}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack} disabled={busy}>
            취소
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            저장
          </button>
        </div>
      </form>

      {original && (
        <button type="button" className="btn btn-danger btn-block" onClick={handleDelete} disabled={busy}>
          자녀 삭제
        </button>
      )}
    </section>
  )
}
