import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { readableTextColor } from '../components/ChildTag'
import { BackIcon, ChevronRightIcon, PlusIcon } from '../components/icons'
import LessonRow from '../components/LessonRow'
import LessonSheet from '../components/LessonSheet'
import MakeupRow from '../components/MakeupRow'
import MakeupSheet from '../components/MakeupSheet'
import MonthGrid from '../components/MonthGrid'
import PageHeader from '../components/PageHeader'
import Segmented from '../components/Segmented'
import { useScopedAcademies } from '../data/academies'
import { useChildren } from '../data/children'
import { buildLessonViews, type LessonView } from '../data/lessonPlan'
import { useLessons } from '../data/lessons'
import { useMakeups } from '../data/makeups'
import { useSelectedChild } from '../data/SelectedChild'
import type { Makeup } from '../data/types'
import {
  addDays,
  addMonths,
  dateParts,
  endOfMonth,
  formatDate,
  isValidDate,
  startOfMonth,
  today,
  weekdayOf,
  type DateStr,
} from '../utils/date'

/** 달력 보기 방식: 월, 주, 일 */
type CalendarMode = 'month' | 'week' | 'day'

const MODE_OPTIONS: { value: CalendarMode; label: string }[] = [
  { value: 'month', label: '월' },
  { value: 'week', label: '주' },
  { value: 'day', label: '일' },
]

const MODE_STORAGE_KEY = 'academy-note:calendar-mode'

/** 달력 칸에 보여줄 일정 하나 */
interface CalendarItem {
  key: string
  academyId: string
  time?: string
  /** 결석, 휴강 */
  missed: boolean
  /** 보강 출석이나 보강 예정 */
  makeup: boolean
}

/** 달력 칸 하나에 보여줄 칩 수. 넘치면 '+2'처럼 줄여서 보여줍니다. */
const MAX_CHIPS = 3

function isMode(value: string | null): value is CalendarMode {
  return value === 'month' || value === 'week' || value === 'day'
}

/** 그 주의 일요일 (달력이 일요일부터라서) */
function startOfWeek(date: DateStr): DateStr {
  return addDays(date, -weekdayOf(date))
}

/**
 * 달력: 월·주·일 탭으로 봅니다.
 * - 월: 칸마다 그날 일정을 칩으로, 날짜를 누르면 아래(넓은 화면은 옆)에 자세히
 * - 주: 일요일부터 7일의 일정을 날짜별로
 * - 일: 하루 일정
 * 고른 날짜와 보기 방식은 주소(?date=&view=)에 남고, 보기 방식은 다음에 열 때도 그대로입니다.
 */
export default function CalendarPage() {
  const [params, setParams] = useSearchParams()
  const todayStr = today()
  const paramDate = params.get('date')
  const selected = paramDate && isValidDate(paramDate) ? paramDate : todayStr
  const paramMode = params.get('view')
  const savedMode = localStorage.getItem(MODE_STORAGE_KEY)
  const mode: CalendarMode = isMode(paramMode) ? paramMode : isMode(savedMode) ? savedMode : 'month'

  const [editing, setEditing] = useState<LessonView | null>(null)
  const [openMakeupId, setOpenMakeupId] = useState<string | null>(null)
  const academies = useScopedAcademies()
  const { children } = useChildren()
  const { selectedChildId } = useSelectedChild()
  const { lessons } = useLessons()
  const { makeups } = useMakeups()

  // 보기 방식에 따라 보여줄 기간
  const [from, to] =
    mode === 'month'
      ? [startOfMonth(selected), endOfMonth(selected)]
      : mode === 'week'
        ? [startOfWeek(selected), addDays(startOfWeek(selected), 6)]
        : [selected, selected]

  const lessonsByDate = useMemo(() => {
    const map = new Map<DateStr, LessonView[]>()
    for (const view of buildLessonViews(academies, lessons, from, to, todayStr)) {
      map.set(view.date, [...(map.get(view.date) ?? []), view])
    }
    return map
  }, [academies, lessons, from, to, todayStr])

  // 날짜를 잡았지만 아직 다녀오지 않은 보강 (다녀온 보강은 보강 출석 수업으로 보입니다)
  const makeupsByDate = useMemo(() => {
    const ids = new Set(academies.map((academy) => academy.id))
    const map = new Map<DateStr, Makeup[]>()
    for (const makeup of makeups) {
      if (!ids.has(makeup.academyId) || makeup.status !== 'open' || !makeup.scheduledOn) continue
      map.set(makeup.scheduledOn, [...(map.get(makeup.scheduledOn) ?? []), makeup])
    }
    return map
  }, [academies, makeups])

  const openMakeup = makeups.find((makeup) => makeup.id === openMakeupId) ?? null

  // 전체 보기이고 자녀가 2명 이상이면 칩을 자녀 색으로 칠해 어느 아이 일정인지 구분합니다.
  const colorByChild = !selectedChildId && children.length > 1
  const academyById = new Map(academies.map((academy) => [academy.id, academy]))
  const childById = new Map(children.map((child) => [child.id, child]))

  function update(next: { date?: DateStr; mode?: CalendarMode }) {
    const nextParams = new URLSearchParams(params)
    if (next.date) nextParams.set('date', next.date)
    if (next.mode) {
      nextParams.set('view', next.mode)
      localStorage.setItem(MODE_STORAGE_KEY, next.mode)
    }
    setParams(nextParams, { replace: true })
  }

  /** 화살표: 월은 한 달, 주는 한 주, 일은 하루씩 */
  function move(direction: -1 | 1) {
    const date =
      mode === 'month' ? addMonths(selected, direction) : addDays(selected, mode === 'week' ? 7 * direction : direction)
    update({ date })
  }

  /** 그날 일정(수업, 보강 출석, 보강 예정)을 시각 순서로 */
  function itemsOn(date: DateStr): CalendarItem[] {
    const items: CalendarItem[] = [
      ...(lessonsByDate.get(date) ?? []).map((view) => ({
        key: view.key,
        academyId: view.academyId,
        time: view.start,
        missed: view.status === 'absent' || view.status === 'cancelled',
        makeup: view.status === 'makeup',
      })),
      ...(makeupsByDate.get(date) ?? []).map((makeup) => ({
        key: makeup.id,
        academyId: makeup.academyId,
        time: makeup.start,
        missed: false,
        makeup: true,
      })),
    ]
    return items.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
  }

  function chipColor(academyId: string): string {
    const academy = academyById.get(academyId)
    return (colorByChild ? childById.get(academy?.childId ?? '')?.color : academy?.color) ?? '#9ca3af'
  }

  /** 하루 일정 목록 (수업과 보강 예정). 누르면 기록 창이 열립니다. */
  function renderDaySchedule(date: DateStr, emptyText = '수업이 없는 날입니다.') {
    const views = lessonsByDate.get(date) ?? []
    const planned = makeupsByDate.get(date) ?? []
    if (views.length + planned.length === 0) {
      return (
        <div className="card">
          <p className="muted">{emptyText}</p>
        </div>
      )
    }
    return (
      <ul className="list">
        {views.map((view) => (
          <li key={view.key}>
            <LessonRow view={view} onClick={() => setEditing(view)} />
          </li>
        ))}
        {planned.map((makeup) => (
          <li key={makeup.id}>
            <MakeupRow makeup={makeup} onClick={() => setOpenMakeupId(makeup.id)} />
          </li>
        ))}
      </ul>
    )
  }

  function dayTitle(date: DateStr) {
    return (
      <>
        {formatDate(date)}
        {date === todayStr && <span className="badge status-today">오늘</span>}
      </>
    )
  }

  if (academies.length === 0) {
    return (
      <section className="narrow">
        <PageHeader title="달력" />
        <div className="card">
          <p>등록된 학원이 없습니다. 학원을 등록하면 수업일이 달력에 표시됩니다.</p>
          <Link to="/settings/academies/new" className="btn btn-primary">
            <PlusIcon />
            학원 등록하기
          </Link>
        </div>
      </section>
    )
  }

  const { year, month: monthNumber } = dateParts(selected)
  const navTitle =
    mode === 'month' ? `${year}년 ${monthNumber}월` : mode === 'week' ? weekTitle(from, to) : formatDate(selected, { withYear: true })
  const showToday = mode === 'month' ? startOfMonth(selected) !== startOfMonth(todayStr) || selected !== todayStr
    : mode === 'week' ? from !== startOfWeek(todayStr)
    : selected !== todayStr

  const navigation = (
    <div className="calendar-toolbar">
      <Segmented<CalendarMode> label="달력 보기" name="calendar-mode" value={mode} options={MODE_OPTIONS}
        onChange={(value) => update({ mode: value })} />
      <div className="month-nav">
        <button type="button" className="icon-btn" onClick={() => move(-1)}
          aria-label={mode === 'month' ? '이전 달' : mode === 'week' ? '이전 주' : '이전 날'}>
          <BackIcon />
        </button>
        <strong>{navTitle}</strong>
        <button type="button" className="icon-btn" onClick={() => move(1)}
          aria-label={mode === 'month' ? '다음 달' : mode === 'week' ? '다음 주' : '다음 날'}>
          <ChevronRightIcon />
        </button>
      </div>
      {showToday && (
        <button type="button" className="btn btn-secondary btn-small today-btn" onClick={() => update({ date: todayStr })}>
          오늘로
        </button>
      )}
    </div>
  )

  return (
    <section>
      <PageHeader title="달력" />

      {mode === 'month' && (
        <div className="calendar-layout">
          <div className="card calendar-card">
            {navigation}
            <MonthGrid
              className="is-calendar"
              month={selected}
              selected={selected}
              onSelect={(date) => update({ date })}
              describeDay={(date) => {
                const items = itemsOn(date)
                if (items.length === 0) return undefined
                return items
                  .map((item) => {
                    const academy = academyById.get(item.academyId)
                    const child = colorByChild ? childById.get(academy?.childId ?? '') : undefined
                    return `${child ? `${child.name} ` : ''}${academy?.name ?? ''}${item.makeup ? ' 보강' : ''}${item.missed ? ' 빠짐' : ''}`
                  })
                  .join(', ')
              }}
              // 달력 칸 안에 일정을 칩으로 바로 보여줍니다. (넓은 화면은 시각도)
              renderDay={(date) => {
                const items = itemsOn(date)
                if (items.length === 0) return null
                return (
                  <span className="day-chips" aria-hidden="true">
                    {items.slice(0, MAX_CHIPS).map((item) => {
                      const color = chipColor(item.academyId)
                      const classes = ['cal-chip', item.missed && 'is-missed', item.makeup && 'is-makeup'].filter(Boolean).join(' ')
                      return (
                        <span key={item.key} className={classes}
                          style={{ '--chip': color, '--chip-text': readableTextColor(color) } as CSSProperties}>
                          {item.time && <span className="cal-chip-time">{item.time}</span>}
                          {academyById.get(item.academyId)?.name}
                        </span>
                      )
                    })}
                    {items.length > MAX_CHIPS && <span className="cal-more">+{items.length - MAX_CHIPS}</span>}
                  </span>
                )
              }}
            />
            <div className="calendar-legend">
              {colorByChild &&
                children.map((child) => (
                  <span key={child.id} className="legend-item">
                    <span className="legend-swatch" style={{ background: child.color }} />
                    {child.name}
                  </span>
                ))}
              <span className="legend-item muted">
                <span className="legend-swatch is-makeup" />
                보강
              </span>
              <span className="legend-item muted">
                <span className="legend-swatch is-missed" />
                결석·휴강
              </span>
            </div>
          </div>

          <div className="day-panel">
            <h2 className="day-title">{dayTitle(selected)}</h2>
            {renderDaySchedule(selected)}
            <p className="muted">수업을 눌러 출석, 결석, 휴강을 기록하세요. 기록하지 않은 지난 수업은 출석으로 봅니다.</p>
          </div>
        </div>
      )}

      {mode === 'week' && (
        <>
          <div className="card calendar-card">{navigation}</div>
          <div className="week-list">
            {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((date) => (
              <div key={date} className={date === selected ? 'week-day is-selected' : 'week-day'}>
                <h2 className={`day-title wd-${weekdayOf(date)}`}>{dayTitle(date)}</h2>
                {renderDaySchedule(date, '수업 없음')}
              </div>
            ))}
          </div>
        </>
      )}

      {mode === 'day' && (
        <div className="narrow day-mode">
          <div className="card calendar-card">{navigation}</div>
          <div className="day-panel">
            <h2 className="day-title">{dayTitle(selected)}</h2>
            {renderDaySchedule(selected)}
            <p className="muted">수업을 눌러 출석, 결석, 휴강을 기록하세요. 기록하지 않은 지난 수업은 출석으로 봅니다.</p>
          </div>
        </div>
      )}

      <LessonSheet view={editing} onClose={() => setEditing(null)} />
      <MakeupSheet makeup={openMakeup} onClose={() => setOpenMakeupId(null)} />
    </section>
  )
}

/** 예: '11월 1일 ~ 7일', 달이 바뀌면 '10월 26일 ~ 11월 1일' */
function weekTitle(from: DateStr, to: DateStr): string {
  const a = dateParts(from)
  const b = dateParts(to)
  return a.month === b.month ? `${a.month}월 ${a.day}일 ~ ${b.day}일` : `${a.month}월 ${a.day}일 ~ ${b.month}월 ${b.day}일`
}
