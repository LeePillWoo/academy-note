import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import ColorPicker from '../../../components/ColorPicker'
import DateField from '../../../components/DateField'
import PageHeader from '../../../components/PageHeader'
import Segmented from '../../../components/Segmented'
import WeekdaySlotsEditor from '../../../components/WeekdaySlotsEditor'
import { useAcademies } from '../../../data/academies'
import { useChildren } from '../../../data/children'
import { nextUnusedColor } from '../../../data/colors'
import { useSelectedChild } from '../../../data/SelectedChild'
import { useGoBack } from '../../../hooks/useGoBack'
import { objectParticle } from '../../../utils/korean'
import { draftFromAcademy, newAcademyDraft, validateDraft, type AcademyDraft } from './draft'
import FeeEditor from './FeeEditor'
import MakeupRuleEditor from './MakeupRuleEditor'
import PeriodList from './PeriodList'

const LIST_PATH = '/settings/academies'

/** 학원 추가(/settings/academies/new)와 수정(/settings/academies/:academyId) 화면 */
export default function AcademyFormPage() {
  const { academyId } = useParams()
  return <AcademyForm key={academyId ?? 'new'} academyId={academyId} />
}

function AcademyForm({ academyId }: { academyId?: string }) {
  const { children } = useChildren()
  const { academies, saveAcademy, removeAcademy } = useAcademies()
  const { selectedChildId } = useSelectedChild()
  const goBack = useGoBack(LIST_PATH)

  // 처음 연 때의 학원을 기억합니다. (삭제 직후 "찾는 학원이 없습니다"가 잠깐 보이지 않게)
  const [original] = useState(() => (academyId ? academies.find((academy) => academy.id === academyId) : undefined))
  const [draft, setDraft] = useState<AcademyDraft>(() => {
    if (original) return draftFromAcademy(original)
    const childId = selectedChildId ?? children[0]?.id ?? ''
    const usedColors = academies.filter((academy) => academy.childId === childId).map((academy) => academy.color)
    return newAcademyDraft(childId, nextUnusedColor(usedColors))
  })
  // 한 번 저장을 눌렀으면 그 뒤로는 고칠 때마다 다시 검사해서 오류 문구를 바로 없앱니다.
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const errors = submitted ? validateDraft(draft).errors : {}

  if (children.length === 0) {
    return (
      <section className="narrow">
        <PageHeader title="학원 추가" backTo={LIST_PATH} />
        <div className="card">
          <p>학원을 등록하려면 먼저 자녀를 등록하세요.</p>
          <Link to="/settings/children/new" className="btn btn-primary">자녀 등록하기</Link>
        </div>
      </section>
    )
  }

  if (academyId && !original) {
    return (
      <section className="narrow">
        <PageHeader title="학원" backTo={LIST_PATH} />
        <div className="card">
          <p>찾는 학원이 없습니다. 이미 삭제되었을 수 있습니다.</p>
        </div>
      </section>
    )
  }

  const set = (patch: Partial<AcademyDraft>) => setDraft((prev) => ({ ...prev, ...patch }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    const { input } = validateDraft(draft)
    if (!input) {
      // 첫 번째 오류 문구가 보이도록 화면을 옮깁니다.
      requestAnimationFrame(() => document.querySelector('.field-error')?.scrollIntoView({ block: 'center' }))
      return
    }
    setBusy(true)
    try {
      await saveAcademy(input)
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
      await removeAcademy(original.id)
      goBack()
    } catch {
      setFormError('삭제하지 못했습니다. 다시 시도하세요.')
      setBusy(false)
    }
  }

  return (
    <section className="narrow">
      <PageHeader title={original ? '학원 수정' : '학원 추가'} backTo={LIST_PATH} />
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="card form-section">
          <h2 className="section-title">기본 정보</h2>
          {children.length > 1 && (
            <div className="field">
              <span className="field-label">자녀</span>
              <Segmented
                label="자녀"
                name="academy-child"
                value={draft.childId}
                onChange={(childId) => set({ childId })}
                options={children.map((child) => ({
                  value: child.id,
                  label: (
                    <>
                      <span className="dot" style={{ background: child.color }} />
                      {child.name}
                    </>
                  ),
                }))}
              />
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="academy-name">학원 이름</label>
            <input id="academy-name" className="input" value={draft.name} maxLength={30} placeholder="예: 수학학원"
              autoComplete="off" onChange={(event) => set({ name: event.target.value })}
              aria-invalid={errors.name ? true : undefined} />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <fieldset className="field">
            <legend className="field-label">표시 색상</legend>
            <ColorPicker name="academy-color" value={draft.color} onChange={(color) => set({ color })} />
          </fieldset>

          <div className="field">
            <label className="field-label" htmlFor="academy-started">수강 시작일</label>
            <DateField id="academy-started" label="수강 시작일" value={draft.startedOn}
              onChange={(startedOn) => set({ startedOn })} />
            <p className="muted">이날부터 수업일과 납부 항목을 만듭니다. 오래 다닌 학원이면 앱에 기록을 시작할 날을 넣으세요.</p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="academy-memo">메모 (선택)</label>
            <textarea id="academy-memo" className="input textarea" rows={3} value={draft.memo} maxLength={500}
              placeholder="원장 연락처, 환불 규정 등" onChange={(event) => set({ memo: event.target.value })} />
          </div>
        </div>

        <div className="card form-section">
          <h2 className="section-title">수업 일정</h2>
          <PeriodList
            label="일정"
            periods={draft.schedules}
            startedOn={draft.startedOn}
            onChange={(schedules) => set({ schedules })}
            copyValue={(slots) => slots.map((slot) => ({ ...slot }))}
            renderValue={(slots, update, index) => (
              <WeekdaySlotsEditor label={index === 0 ? '수업' : `수업 변경 ${index}`} slots={slots} onChange={update}
                defaultStart="16:00" defaultEnd="17:00" />
            )}
          />
          {errors.schedules && <p className="field-error">{errors.schedules}</p>}
        </div>

        <div className="card form-section">
          <h2 className="section-title">수강료</h2>
          <PeriodList
            label="수강료"
            periods={draft.fees}
            startedOn={draft.startedOn}
            onChange={(fees) => set({ fees })}
            copyValue={(fee) => ({ ...fee })}
            renderValue={(fee, update, index) => (
              <FeeEditor idPrefix={`fee-${index}`} value={fee} onChange={update} isFirst={index === 0} />
            )}
          />
          {errors.fees && <p className="field-error">{errors.fees}</p>}
        </div>

        <div className="card form-section">
          <h2 className="section-title">보강 규칙</h2>
          <MakeupRuleEditor value={draft.makeupRule} onChange={(makeupRule) => set({ makeupRule })} />
          {errors.makeup && <p className="field-error">{errors.makeup}</p>}
        </div>

        {formError && <p className="field-error" role="alert">{formError}</p>}

        <div className="form-actions sticky-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack} disabled={busy}>
            취소
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            저장
          </button>
        </div>
      </form>

      {original && (
        <button type="button" className="btn btn-danger btn-block delete-btn" onClick={handleDelete} disabled={busy}>
          학원 삭제
        </button>
      )}
    </section>
  )
}
