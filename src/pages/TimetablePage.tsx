import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router'
import DateField from '../components/DateField'
import { PlusIcon, PrinterIcon } from '../components/icons'
import PageHeader from '../components/PageHeader'
import Segmented from '../components/Segmented'
import Sheet from '../components/Sheet'
import TimetablePrintSheet from '../components/TimetablePrintSheet'
import { printPage } from '../native/print'
import { useAcademies, useScopedAcademies } from '../data/academies'
import { describeSlots, periodAt } from '../data/academyRules'
import { useChildren } from '../data/children'
import { softColorVars } from '../data/colors'
import { useSelectedChild } from '../data/SelectedChild'
import {
  MIN_DURATION,
  buildBlocks,
  dayIndexOf,
  moveSlot,
  resizeSlot,
  schedulesWithChange,
  snapMinutes,
  timeRange,
  toMinutes,
  toTime,
  weekdayAt,
  type TimetableBlock,
} from '../data/timetable'
import type { TimeSlot } from '../data/types'
import { WEEKDAY_NAMES, WEEKDAYS_FROM_MONDAY, formatDate, today, weekdayOf, type DateStr } from '../utils/date'

/** 한 시간의 높이 (rem). 7시~24시가 모두 보이므로 너무 길어지지 않게 잡았습니다. */
const HOUR_HEIGHT_REM = 3

/** 블록 전체를 옮기기 / 위 모서리로 시작 시각 바꾸기 / 아래 모서리로 끝 시각 바꾸기 */
type DragMode = 'move' | 'resize-start' | 'resize-end'

interface DragState {
  blockId: string
  mode: DragMode
  dayIndex: number
  startMin: number
  endMin: number
}

interface DragRef extends DragState {
  startX: number
  startY: number
  orig: { dayIndex: number; startMin: number; endMin: number }
  colWidth: number
  pxPerMin: number
}

type ApplyMode = 'date' | 'current'

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

/** 시간표에서 숨긴 자녀 (다음에 열 때도 유지) */
const HIDDEN_KEY = 'academy-note:timetable-hidden-children'

function readHiddenChildIds(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

/**
 * 시간표: 한 주의 수업을 요일 × 시각 격자에 보여줍니다.
 * 편집 모드에서는 블록을 끌어서 요일과 시각을 옮기고, 위아래 모서리를 끌어 시작·끝 시각을 바꿉니다.
 * 저장할 때 언제부터 적용할지 고릅니다.
 */
export default function TimetablePage() {
  const academies = useScopedAcademies()
  const { saveAcademy } = useAcademies()
  const { children } = useChildren()
  const { selectedChildId } = useSelectedChild()
  const todayStr = today()
  const [asOf, setAsOf] = useState<DateStr>(todayStr)
  const [editing, setEditing] = useState(false)
  const [overrides, setOverrides] = useState<Map<string, TimeSlot[]>>(new Map())
  const [drag, setDrag] = useState<DragState | null>(null)
  const [message, setMessage] = useState('')
  const [infoBlockId, setInfoBlockId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // 전체 보기에서 시간표에 보일 자녀. 오른쪽 위 자녀 칸을 눌러 켜고 끕니다. (인쇄도 이 기준)
  const [hiddenChildIds, setHiddenChildIds] = useState<Set<string>>(() => new Set(readHiddenChildIds()))
  const daysRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragRef | null>(null)

  // 전체 보기이고 자녀가 2명 이상이면 블록을 자녀 색으로 칠하고, 자녀 칸으로 보일 자녀를 고릅니다.
  const colorByChild = !selectedChildId && children.length > 1
  const visibleAcademies = useMemo(
    () => (colorByChild ? academies.filter((academy) => !hiddenChildIds.has(academy.childId)) : academies),
    [academies, colorByChild, hiddenChildIds],
  )
  const blocks = useMemo(() => buildBlocks(visibleAcademies, asOf, overrides), [visibleAcademies, asOf, overrides])
  const range = useMemo(() => timeRange(blocks), [blocks])
  const totalMin = range.endMin - range.startMin
  const hours = Array.from({ length: totalMin / 60 }, (_, i) => (range.startMin + i * 60) / 60)
  const academyById = new Map(academies.map((academy) => [academy.id, academy]))
  const childById = new Map(children.map((child) => [child.id, child]))
  const visibleChildren = colorByChild
    ? children.filter((child) => !hiddenChildIds.has(child.id))
    : selectedChildId
      ? children.filter((child) => child.id === selectedChildId)
      : children
  const todayIndex = dayIndexOf(weekdayOf(todayStr))

  /** 자녀 칸 누르기: null이면 전체 보이기, 아니면 그 자녀 켜고 끄기 */
  function toggleChild(childId: string | null) {
    setHiddenChildIds((prev) => {
      const next = new Set(prev)
      if (childId === null) next.clear()
      else if (next.has(childId)) next.delete(childId)
      else next.add(childId)
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]))
      return next
    })
  }
  const changedCount = overrides.size

  // 안내 문구는 잠시 뒤 사라집니다.
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 3500)
    return () => clearTimeout(timer)
  }, [message])

  function blockColor(block: TimetableBlock): string {
    const academy = academyById.get(block.academyId)
    return (colorByChild ? childById.get(academy?.childId ?? '')?.color : academy?.color) ?? '#9ca3af'
  }

  function slotsOf(academyId: string): TimeSlot[] {
    const academy = academyById.get(academyId)
    return overrides.get(academyId) ?? (academy ? periodAt(academy.schedules, asOf) : [])
  }

  function isChanged(block: TimetableBlock): boolean {
    const academy = academyById.get(block.academyId)
    if (!academy || !overrides.has(block.academyId)) return false
    const original = periodAt(academy.schedules, asOf).find((slot) => slot.weekday === block.weekday)
    return !original || original.start !== block.start || original.end !== block.end
  }

  // ── 끌기 ──
  function onPointerDown(event: ReactPointerEvent<HTMLElement>, block: TimetableBlock, mode: DragMode) {
    if (!editing || !daysRef.current) return
    // 모서리를 잡았으면 블록 옮기기가 같이 시작되지 않게 합니다.
    if (mode !== 'move') event.stopPropagation()
    const rect = daysRef.current.getBoundingClientRect()
    const dayIndex = dayIndexOf(block.weekday)
    const startMin = toMinutes(block.start)
    const endMin = toMinutes(block.end)
    dragRef.current = {
      blockId: block.id,
      mode,
      dayIndex,
      startMin,
      endMin,
      startX: event.clientX,
      startY: event.clientY,
      orig: { dayIndex, startMin, endMin },
      colWidth: rect.width / 7,
      pxPerMin: rect.height / totalMin,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ blockId: block.id, mode, dayIndex, startMin, endMin })
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const current = dragRef.current
    if (!current) return
    const dy = (event.clientY - current.startY) / current.pxPerMin
    let { dayIndex, startMin, endMin } = current
    if (current.mode === 'move') {
      const duration = current.orig.endMin - current.orig.startMin
      dayIndex = clamp(current.orig.dayIndex + Math.round((event.clientX - current.startX) / current.colWidth), 0, 6)
      startMin = clamp(snapMinutes(current.orig.startMin + dy), range.startMin, range.endMin - duration)
      endMin = startMin + duration
    } else if (current.mode === 'resize-end') {
      endMin = clamp(snapMinutes(current.orig.endMin + dy), current.orig.startMin + MIN_DURATION, range.endMin)
    } else {
      startMin = clamp(snapMinutes(current.orig.startMin + dy), range.startMin, current.orig.endMin - MIN_DURATION)
    }
    if (dayIndex !== current.dayIndex || startMin !== current.startMin || endMin !== current.endMin) {
      Object.assign(current, { dayIndex, startMin, endMin })
      setDrag({ blockId: current.blockId, mode: current.mode, dayIndex, startMin, endMin })
    }
  }

  function onPointerUp(block: TimetableBlock) {
    const current = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (!current) return
    const { orig } = current
    if (current.dayIndex === orig.dayIndex && current.startMin === orig.startMin && current.endMin === orig.endMin) return
    const result =
      current.mode === 'move'
        ? moveSlot(slotsOf(block.academyId), block.weekday, weekdayAt(current.dayIndex), toTime(current.startMin))
        : resizeSlot(slotsOf(block.academyId), block.weekday, toTime(current.startMin), toTime(current.endMin))
    if ('error' in result) {
      setMessage(result.error)
      return
    }
    setOverrides((prev) => new Map(prev).set(block.academyId, result.slots))
  }

  function cancelDrag() {
    dragRef.current = null
    setDrag(null)
  }

  function cancelEditing() {
    setOverrides(new Map())
    setEditing(false)
    cancelDrag()
  }

  if (academies.length === 0) {
    return (
      <section className="narrow">
        <PageHeader title="시간표" subtitle="한 주 수업을 한눈에 봅니다." />
        <div className="card">
          <p>등록된 학원이 없습니다. 학원을 등록하면 시간표에 나타납니다.</p>
          <Link to="/settings/academies/new" className="btn btn-primary">
            <PlusIcon />
            학원 등록하기
          </Link>
        </div>
      </section>
    )
  }

  const infoBlock = infoBlockId ? blocks.find((block) => block.id === infoBlockId) ?? null : null

  return (
    <section>
      <PageHeader
        title="시간표"
        subtitle="한 주 수업을 한눈에 봅니다. 편집에서 블록을 끌어 옮기고, 모서리를 끌어 시간을 바꿉니다."
        actions={
          editing ? (
            <div className="tt-actions">
              <button type="button" className="btn btn-secondary btn-small" onClick={cancelEditing}>
                취소
              </button>
              <button type="button" className="btn btn-primary btn-small" disabled={changedCount === 0} onClick={() => setSaving(true)}>
                저장{changedCount > 0 && ` (${changedCount})`}
              </button>
            </div>
          ) : (
            <div className="tt-actions">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => printPage('학원노트 시간표')}>
                <PrinterIcon />
                인쇄
              </button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setEditing(true)}>
                편집
              </button>
            </div>
          )
        }
      />

      <div className="card timetable-card">
        <div className="tt-toolbar">
          <div className="tt-asof">
            <span className="muted">기준 날짜</span>
            <DateField label="기준 날짜" value={asOf} onChange={setAsOf} />
          </div>
          {colorByChild && (
            <div className="chips tt-child-toggles" role="group" aria-label="시간표에 보일 자녀">
              <button type="button" className="chip" aria-pressed={hiddenChildIds.size === 0} onClick={() => toggleChild(null)}>
                전체
              </button>
              {children.map((child) => (
                <button key={child.id} type="button" className="chip" aria-pressed={!hiddenChildIds.has(child.id)}
                  onClick={() => toggleChild(child.id)}>
                  <span className="legend-swatch" style={softColorVars(child.color) as CSSProperties} />
                  {child.name}
                </button>
              ))}
            </div>
          )}
        </div>
        {editing && (
          <p className="muted">블록을 끌어 요일·시각을 옮기고, 위아래 모서리를 끌어 시작·끝 시각을 바꾸세요. 10분 단위입니다.</p>
        )}
        {message && (
          <p className="tt-message" role="status">
            {message}
          </p>
        )}

        <div className="timetable-scroll">
          <div className="timetable" style={{ '--hours': hours.length, '--hour-height': `${HOUR_HEIGHT_REM}rem` } as CSSProperties}>
            <div className="tt-corner" />
            {WEEKDAYS_FROM_MONDAY.map((weekday, index) => (
              <div key={weekday} className={`tt-head wd-${weekday}${index === todayIndex ? ' is-today' : ''}`}>
                <span>{WEEKDAY_NAMES[weekday]}</span>
              </div>
            ))}
            <div className="tt-times" aria-hidden="true">
              {hours.map((hour, i) => (
                <span key={hour} className="tt-time" style={{ top: `${i * HOUR_HEIGHT_REM}rem` }}>
                  {hour}:00
                </span>
              ))}
            </div>
            <div className="tt-days" ref={daysRef}>
              <div className="tt-today-col" style={{ left: `calc(${todayIndex} * 100% / 7)`, width: 'calc(100% / 7)' }} />
              {blocks.map((block) => {
                const academy = academyById.get(block.academyId)
                const dragging = drag?.blockId === block.id ? drag : null
                const dayIndex = dragging ? dragging.dayIndex : dayIndexOf(block.weekday)
                const startMin = dragging ? dragging.startMin : toMinutes(block.start)
                const endMin = dragging ? dragging.endMin : toMinutes(block.end)
                const duration = endMin - startMin
                const child = colorByChild ? childById.get(academy?.childId ?? '') : undefined
                const classes = ['tt-block', editing && 'is-editable', dragging && 'is-dragging', isChanged(block) && 'is-changed']
                  .filter(Boolean)
                  .join(' ')
                const label = `${child ? `${child.name} ` : ''}${academy?.name ?? ''} ${WEEKDAY_NAMES[weekdayAt(dayIndex)]} ${toTime(startMin)}~${toTime(endMin)}`
                return (
                  <button
                    key={block.id}
                    type="button"
                    className={classes}
                    style={
                      {
                        ...softColorVars(blockColor(block)),
                        left: `calc(${dayIndex} * 100% / 7 + 2px)`,
                        width: 'calc(100% / 7 - 4px)',
                        top: `${((startMin - range.startMin) / 60) * HOUR_HEIGHT_REM}rem`,
                        height: `${(duration / 60) * HOUR_HEIGHT_REM}rem`,
                      } as CSSProperties
                    }
                    aria-label={label}
                    title={label}
                    onPointerDown={(event) => onPointerDown(event, block, 'move')}
                    onPointerMove={onPointerMove}
                    onPointerUp={() => onPointerUp(block)}
                    onPointerCancel={cancelDrag}
                    onClick={() => !editing && setInfoBlockId(block.id)}
                  >
                    {editing && <span className="tt-handle is-start" aria-hidden="true" onPointerDown={(event) => onPointerDown(event, block, 'resize-start')} />}
                    <span className="tt-block-name">{academy?.name}</span>
                    <span className="tt-block-time">
                      {toTime(startMin)}~{toTime(endMin)}
                    </span>
                    {child && duration >= 75 && <span className="tt-block-time">{child.name}</span>}
                    {editing && <span className="tt-handle is-end" aria-hidden="true" onPointerDown={(event) => onPointerDown(event, block, 'resize-end')} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <TimetablePrintSheet blocks={blocks} academies={academies} childList={children} colorByChild={colorByChild} asOf={asOf}
        titleNames={visibleChildren.map((child) => child.name)} />
      <BlockInfoSheet block={infoBlock} asOf={asOf} onClose={() => setInfoBlockId(null)} />
      <SaveSheet
        open={saving}
        asOf={asOf}
        overrides={overrides}
        onClose={() => setSaving(false)}
        onApply={async (mode, applyFrom) => {
          for (const [academyId, slots] of overrides) {
            const academy = academyById.get(academyId)
            if (!academy) continue
            await saveAcademy({ ...academy, schedules: schedulesWithChange(academy, slots, mode === 'current' ? 'current' : applyFrom, asOf) })
          }
          setOverrides(new Map())
          setEditing(false)
          setSaving(false)
          setMessage('시간표를 저장했습니다.')
        }}
      />
    </section>
  )
}

/** 블록을 누르면 열리는 작은 창: 학원 정보와 설정으로 가는 링크 */
function BlockInfoSheet({ block, asOf, onClose }: { block: TimetableBlock | null; asOf: DateStr; onClose(): void }) {
  const { academies } = useAcademies()
  const { children } = useChildren()
  const academy = block ? academies.find((item) => item.id === block.academyId) : undefined
  const child = academy ? children.find((item) => item.id === academy.childId) : undefined
  return (
    <Sheet open={block !== null} onClose={onClose} label="수업 정보">
      {block && academy && (
        <>
          <div className="sheet-header">
            <h2 className="sheet-title">
              <span className="dot" style={{ background: academy.color }} />
              {academy.name}
              {child && children.length > 1 && <span className="muted"> · {child.name}</span>}
            </h2>
            <p className="muted">
              {WEEKDAY_NAMES[block.weekday]}요일 {block.start}~{block.end}
              {academy.subject && ` · ${academy.subject}`}
            </p>
          </div>
          <p className="muted">
            {formatDate(asOf)} 기준 일정: {describeSlots(periodAt(academy.schedules, asOf))}
          </p>
          <div className="sheet-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              닫기
            </button>
            <Link to={`/settings/academies/${academy.id}`} className="btn btn-primary">
              학원 설정 열기
            </Link>
          </div>
        </>
      )}
    </Sheet>
  )
}

interface SaveSheetProps {
  open: boolean
  asOf: DateStr
  overrides: Map<string, TimeSlot[]>
  onClose(): void
  onApply(mode: ApplyMode, applyFrom: DateStr): Promise<void>
}

/** 저장할 때: 바뀐 내용을 보여주고 언제부터 적용할지 고릅니다. */
function SaveSheet({ open, asOf, overrides, onClose, onApply }: SaveSheetProps) {
  const { academies } = useAcademies()
  const todayStr = today()
  const [mode, setMode] = useState<ApplyMode>('date')
  const [applyFrom, setApplyFrom] = useState<DateStr>(asOf > todayStr ? asOf : todayStr)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function apply() {
    setBusy(true)
    setError('')
    try {
      await onApply(mode, applyFrom)
    } catch {
      setError('저장하지 못했습니다. 다시 시도하세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="시간표 변경 적용">
      <h2 className="sheet-title">시간표 변경 적용</h2>
      <ul className="change-list">
        {[...overrides].map(([academyId, slots]) => {
          const academy = academies.find((item) => item.id === academyId)
          if (!academy) return null
          return (
            <li key={academyId}>
              <strong>{academy.name}</strong>
              <span className="muted">
                {describeSlots(periodAt(academy.schedules, asOf))} → {describeSlots(slots)}
              </span>
            </li>
          )
        })}
      </ul>
      <Segmented<ApplyMode>
        label="적용 방식"
        name="apply-mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'date', label: '날짜부터 적용' },
          { value: 'current', label: '지금 일정 고치기' },
        ]}
      />
      {mode === 'date' ? (
        <>
          <div className="field">
            <label className="field-label" htmlFor="apply-from">적용 시작일</label>
            <DateField id="apply-from" label="적용 시작일" value={applyFrom} onChange={setApplyFrom} />
          </div>
          <p className="muted">그 전 달력과 출석 기록은 그대로 두고, 이날부터 새 일정이 됩니다. 학원 설정의 "일정 변경"과 같습니다.</p>
        </>
      ) : (
        <p className="muted">지금 보이는 일정 자체를 고칩니다. 요일이나 시각을 잘못 넣었을 때 쓰세요. 지난 달력도 함께 바뀝니다.</p>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
          취소
        </button>
        <button type="button" className="btn btn-primary" onClick={apply} disabled={busy || overrides.size === 0}>
          적용
        </button>
      </div>
    </Sheet>
  )
}
