import { useState } from 'react'
import { useAcademies } from '../data/academies'
import { useChildren } from '../data/children'
import { MAKEUP_STATE_LABELS, defaultMakeupTime, describeDeadline, makeupState, scheduleWarnings } from '../data/makeupRules'
import { useMakeups, type MakeupTime } from '../data/makeups'
import type { Makeup } from '../data/types'
import { formatDate, isValidTime, today, type DateStr } from '../utils/date'
import DateField from './DateField'
import { REASON_LABELS } from './MakeupRow'
import Sheet from './Sheet'

interface MakeupSheetProps {
  /** 열 보강. null이면 창을 닫습니다. */
  makeup: Makeup | null
  onClose(): void
}

/** 보강 하나를 관리하는 창: 날짜 잡기(예정), 다녀옴(완료), 보강 안 함 */
export default function MakeupSheet({ makeup, onClose }: MakeupSheetProps) {
  return (
    <Sheet open={makeup !== null} onClose={onClose} label="보강">
      {makeup && <MakeupEditor key={makeup.id} makeup={makeup} onDone={onClose} />}
    </Sheet>
  )
}

export function MakeupEditor({ makeup, onDone }: { makeup: Makeup; onDone(): void }) {
  const { academies } = useAcademies()
  const { children } = useChildren()
  const actions = useMakeups()
  const academy = academies.find((item) => item.id === makeup.academyId)
  const child = children.find((item) => item.id === academy?.childId)
  const todayStr = today()
  const state = makeupState(makeup, todayStr)

  const [date, setDate] = useState<DateStr>(makeup.scheduledOn ?? '')
  const [start, setStart] = useState(makeup.start ?? '')
  const [end, setEnd] = useState(makeup.end ?? '')
  // 시각을 직접 고쳤는지. 고치지 않았으면 날짜를 바꿀 때 그 날짜의 기본 시각으로 다시 채웁니다.
  const [timeEdited, setTimeEdited] = useState(!!makeup.start)
  const [memo, setMemo] = useState(makeup.memo)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!academy) return null

  const timeError = date && (!isValidTime(start) || !isValidTime(end) || end <= start) ? '끝 시각은 시작 시각보다 늦어야 합니다.' : ''
  const warnings = date ? scheduleWarnings({ makeup, academy, makeups: actions.makeups, date, start, end }) : []
  const canSave = !!date && !timeError && !busy
  // 오늘이나 지난 날짜면 "다녀왔어요"로 바로 완료할 수 있습니다.
  const canComplete = canSave && date <= todayStr
  const time: MakeupTime = { date, start, end }

  function pickDate(value: DateStr) {
    setDate(value)
    // 보강 가능 시간이나 원래 수업 시각으로 채웁니다.
    if (!timeEdited) {
      const defaults = defaultMakeupTime(academy!, value)
      setStart(defaults.start)
      setEnd(defaults.end)
    }
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

  const header = (
    <div className="sheet-header">
      <h2 className="sheet-title">
        <span className="dot" style={{ background: academy.color }} />
        {academy.name} 보강
        {child && children.length > 1 && <span className="muted"> · {child.name}</span>}
      </h2>
      <p className="muted">
        {formatDate(makeup.missedOn)} {REASON_LABELS[makeup.reason]}분 · 기한: {describeDeadline(makeup.deadline, todayStr)}
      </p>
      <p>
        <span className={`badge makeup-${state}`}>{MAKEUP_STATE_LABELS[state]}</span>
      </p>
    </div>
  )

  if (state === 'done' || state === 'skipped') {
    return (
      <>
        {header}
        <p>
          {state === 'done'
            ? `${formatDate(makeup.scheduledOn!)} ${makeup.start ?? ''}~${makeup.end ?? ''}에 다녀왔습니다.`
            : '보강하지 않기로 했습니다.'}
        </p>
        {makeup.memo && <p className="muted">메모: {makeup.memo}</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={onDone}>닫기</button>
          <button type="button" className="btn btn-secondary" disabled={busy}
            onClick={() => run(() => (state === 'done' ? actions.uncompleteMakeup(makeup) : actions.reopenMakeup(makeup)))}>
            {state === 'done' ? '완료 취소' : '다시 보강하기'}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <div className="field">
        <label className="field-label" htmlFor="makeup-date">보강 날짜</label>
        <DateField id="makeup-date" label="보강 날짜" value={date} onChange={pickDate} />
      </div>
      {date && (
        <div className="slot-row">
          <span className="slot-day slot-label">시각</span>
          <input type="time" className="input time-input" step={300} value={start} aria-label="보강 시작 시각"
            onChange={(event) => { setStart(event.target.value); setTimeEdited(true) }} />
          <span aria-hidden="true">~</span>
          <input type="time" className="input time-input" step={300} value={end} aria-label="보강 끝 시각"
            onChange={(event) => { setEnd(event.target.value); setTimeEdited(true) }} />
        </div>
      )}
      {timeError && <p className="field-error">{timeError}</p>}
      {warnings.length > 0 && (
        <ul className="warnings" aria-label="확인할 점">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <div className="field">
        <label className="field-label" htmlFor="makeup-memo">메모 (선택)</label>
        <input id="makeup-memo" className="input" value={memo} maxLength={100} autoComplete="off"
          placeholder="예: 원장님과 통화함" onChange={(event) => setMemo(event.target.value)} />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>닫기</button>
        {canComplete ? (
          <button type="button" className="btn btn-primary" onClick={() => run(() => actions.completeMakeup(makeup, time, memo.trim()))}>
            다녀왔어요
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={!canSave}
            onClick={() => run(() => actions.scheduleMakeup(makeup, time, memo.trim()))}>
            날짜 저장
          </button>
        )}
      </div>
      {canComplete && (
        <button type="button" className="btn btn-secondary btn-block" disabled={busy}
          onClick={() => run(() => actions.scheduleMakeup(makeup, time, memo.trim()))}>
          날짜만 저장 (아직 안 감)
        </button>
      )}
      <div className="link-actions">
        {makeup.scheduledOn && (
          <button type="button" className="link-btn" disabled={busy} onClick={() => run(() => actions.unscheduleMakeup(makeup))}>
            날짜 취소
          </button>
        )}
        <button type="button" className="link-btn" disabled={busy} onClick={() => run(() => actions.skipMakeup(makeup, memo.trim()))}>
          보강 안 함
        </button>
      </div>
    </>
  )
}
