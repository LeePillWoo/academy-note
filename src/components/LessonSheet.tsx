import { useState } from 'react'
import { useAcademies } from '../data/academies'
import { useChildren } from '../data/children'
import type { LessonView } from '../data/lessonPlan'
import { useLessons } from '../data/lessons'
import { describeDeadline, makeupDeadline, qualifiesForMakeup } from '../data/makeupRules'
import { useMakeups } from '../data/makeups'
import type { LessonStatus } from '../data/types'
import { formatDate, today } from '../utils/date'
import { MakeupEditor } from './MakeupSheet'
import Segmented from './Segmented'
import Sheet from './Sheet'

interface LessonSheetProps {
  /** 기록할 수업. null이면 창을 닫습니다. */
  view: LessonView | null
  onClose(): void
}

/** 수업 하나에 출석, 결석, 휴강을 기록하는 창. 보강 출석이면 그 보강의 창을 보여줍니다. */
export default function LessonSheet({ view, onClose }: LessonSheetProps) {
  const { makeups } = useMakeups()
  const makeup = view?.status === 'makeup' ? makeups.find((item) => item.id === view.record?.makeupId) : undefined
  return (
    <Sheet open={view !== null} onClose={onClose} label={makeup ? '보강' : '수업 기록'}>
      {view && (makeup ? <MakeupEditor key={makeup.id} makeup={makeup} onDone={onClose} /> : <LessonEditor key={view.key} view={view} onDone={onClose} />)}
    </Sheet>
  )
}

type EditableStatus = Exclude<LessonStatus, 'makeup'>

const STATUS_OPTIONS: { value: EditableStatus; label: string }[] = [
  { value: 'attended', label: '출석' },
  { value: 'absent', label: '결석' },
  { value: 'cancelled', label: '휴강' },
]

const MEMO_PLACEHOLDER: Record<EditableStatus, string> = {
  attended: '메모',
  absent: '결석 사유 (예: 감기)',
  cancelled: '휴강 사유 (예: 학원 사정)',
}

function LessonEditor({ view, onDone }: { view: LessonView; onDone(): void }) {
  const { academies } = useAcademies()
  const { children } = useChildren()
  const { recordLesson, clearLesson } = useLessons()
  const { makeups } = useMakeups()
  const recorded = view.record?.status
  // 기록이 없는 지난 수업은 출석을 미리 골라 둡니다.
  const [status, setStatus] = useState<EditableStatus | null>(
    recorded && recorded !== 'makeup' ? recorded : view.assumed ? 'attended' : null,
  )
  const [memo, setMemo] = useState(view.record?.memo ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const academy = academies.find((item) => item.id === view.academyId)
  const child = children.find((item) => item.id === academy?.childId)
  if (!academy) return null

  // 저장하면 보강이 어떻게 되는지 미리 알려줍니다.
  const linkedMakeup = view.record ? makeups.find((makeup) => makeup.lessonId === view.record!.id) : undefined
  const willQualify = status !== null && qualifiesForMakeup(academy.makeupRule, status)
  let makeupNote = ''
  if (willQualify && !linkedMakeup) {
    makeupNote = `저장하면 보강 항목이 생깁니다. (기한: ${describeDeadline(makeupDeadline(academy.makeupRule, view.date), today())})`
  } else if (!willQualify && linkedMakeup) {
    makeupNote = linkedMakeup.status === 'done'
      ? '저장하면 이 수업의 보강과 보강 출석 기록이 지워집니다.'
      : '저장하면 이 수업의 보강이 지워집니다.'
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
      onDone()
    } catch {
      setError('저장하지 못했습니다. 다시 시도하세요.')
      setBusy(false)
    }
  }

  return (
    <>
      <div className="sheet-header">
        <h2 className="sheet-title">
          <span className="dot" style={{ background: academy.color }} />
          {academy.name}
          {child && children.length > 1 && <span className="muted"> · {child.name}</span>}
        </h2>
        <p className="muted">
          {formatDate(view.date)}
          {view.start && ` ${view.start}~${view.end}`}
        </p>
      </div>

      <Segmented<EditableStatus> label="출석 상태" name="lesson-status" value={status} onChange={setStatus}
        options={STATUS_OPTIONS} />
      {view.assumed && <p className="muted">기록하지 않은 지난 수업은 출석으로 봅니다.</p>}
      {makeupNote && <p className="note">{makeupNote}</p>}

      <div className="field">
        <label className="field-label" htmlFor="lesson-memo">메모 (선택)</label>
        <input id="lesson-memo" className="input" value={memo} maxLength={100} autoComplete="off"
          placeholder={MEMO_PLACEHOLDER[status ?? 'attended']} onChange={(event) => setMemo(event.target.value)} />
      </div>

      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>
          취소
        </button>
        <button type="button" className="btn btn-primary" disabled={!status || busy}
          onClick={() => status && run(() => recordLesson(view, status, memo.trim()))}>
          저장
        </button>
      </div>

      {view.record && (
        <button type="button" className="link-btn is-danger" disabled={busy} onClick={() => run(() => clearLesson(view.record!.id))}>
          기록 지우기
        </button>
      )}
    </>
  )
}
