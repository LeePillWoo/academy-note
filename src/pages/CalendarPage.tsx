import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BackIcon, ChevronRightIcon, PlusIcon } from '../components/icons'
import LessonRow from '../components/LessonRow'
import LessonSheet from '../components/LessonSheet'
import MakeupRow from '../components/MakeupRow'
import MakeupSheet from '../components/MakeupSheet'
import MonthGrid from '../components/MonthGrid'
import PageHeader from '../components/PageHeader'
import { useScopedAcademies } from '../data/academies'
import { buildLessonViews, type LessonView } from '../data/lessonPlan'
import { useLessons } from '../data/lessons'
import { useMakeups } from '../data/makeups'
import type { Makeup } from '../data/types'
import { addMonths, dateParts, endOfMonth, formatDate, isValidDate, startOfMonth, today, type DateStr } from '../utils/date'

/**
 * 달력: 수업일에 학원 색 점을 찍고, 날짜를 누르면 아래(넓은 화면은 옆)에 그날 수업이 나옵니다.
 * 고른 날짜는 주소(?date=)에 남아서 다른 화면에 다녀와도 그대로입니다.
 */
export default function CalendarPage() {
  const [params, setParams] = useSearchParams()
  const todayStr = today()
  const paramDate = params.get('date')
  const selected = paramDate && isValidDate(paramDate) ? paramDate : todayStr
  const [month, setMonth] = useState(() => startOfMonth(selected))
  const [editing, setEditing] = useState<LessonView | null>(null)
  const [openMakeupId, setOpenMakeupId] = useState<string | null>(null)
  const academies = useScopedAcademies()
  const { lessons } = useLessons()
  const { makeups } = useMakeups()

  // 날짜를 잡았지만 아직 다녀오지 않은 보강 (다녀온 보강은 보강 출석 수업으로 보입니다)
  const scheduledByDate = useMemo(() => {
    const ids = new Set(academies.map((academy) => academy.id))
    const map = new Map<DateStr, Makeup[]>()
    for (const makeup of makeups) {
      if (!ids.has(makeup.academyId) || makeup.status !== 'open' || !makeup.scheduledOn) continue
      map.set(makeup.scheduledOn, [...(map.get(makeup.scheduledOn) ?? []), makeup])
    }
    return map
  }, [academies, makeups])
  const dayMakeups = scheduledByDate.get(selected) ?? []
  const openMakeup = makeups.find((makeup) => makeup.id === openMakeupId) ?? null

  const from = startOfMonth(month)
  const to = endOfMonth(month)
  const monthViews = useMemo(() => buildLessonViews(academies, lessons, from, to, todayStr), [academies, lessons, from, to, todayStr])
  const byDate = useMemo(() => {
    const map = new Map<DateStr, LessonView[]>()
    for (const view of monthViews) map.set(view.date, [...(map.get(view.date) ?? []), view])
    return map
  }, [monthViews])
  const dayViews = useMemo(
    () => (selected >= from && selected <= to ? byDate.get(selected) ?? [] : buildLessonViews(academies, lessons, selected, selected, todayStr)),
    [selected, from, to, byDate, academies, lessons, todayStr],
  )
  const colorOf = (academyId: string) => academies.find((academy) => academy.id === academyId)?.color

  function select(date: DateStr) {
    setParams({ date }, { replace: true })
    if (date < from || date > to) setMonth(startOfMonth(date))
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

  const { year, month: monthNumber } = dateParts(month)

  return (
    <section>
      <PageHeader title="달력" />
      <div className="calendar-layout">
        <div className="card calendar-card">
          <div className="month-nav">
            <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="이전 달">
              <BackIcon />
            </button>
            <strong>{year}년 {monthNumber}월</strong>
            <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="다음 달">
              <ChevronRightIcon />
            </button>
          </div>
          <MonthGrid
            className="is-calendar"
            month={month}
            selected={selected}
            onSelect={select}
            describeDay={(date) => {
              const lessonCount = byDate.get(date)?.length
              const makeupCount = scheduledByDate.get(date)?.length
              return [lessonCount && `수업 ${lessonCount}개`, makeupCount && `보강 예정 ${makeupCount}개`].filter(Boolean).join(', ') || undefined
            }}
            renderDay={(date) => {
              const views = byDate.get(date) ?? []
              const planned = scheduledByDate.get(date) ?? []
              if (views.length + planned.length === 0) return null
              // 결석·휴강은 속이 빈 점, 보강 예정은 네모 점
              return (
                <span className="day-dots" aria-hidden="true">
                  {views.slice(0, 4).map((view) => (
                    <span key={view.key}
                      className={view.status === 'absent' || view.status === 'cancelled' ? 'day-dot is-missed' : 'day-dot'}
                      style={{ '--dot': colorOf(view.academyId) } as CSSProperties} />
                  ))}
                  {planned.slice(0, 2).map((makeup) => (
                    <span key={makeup.id} className="day-dot is-makeup" style={{ '--dot': colorOf(makeup.academyId) } as CSSProperties} />
                  ))}
                </span>
              )
            }}
          />
          {(selected !== todayStr || from !== startOfMonth(todayStr)) && (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => select(todayStr)}>
              오늘로
            </button>
          )}
        </div>

        <div className="day-panel">
          <h2 className="day-title">
            {formatDate(selected)}
            {selected === todayStr && <span className="badge status-today">오늘</span>}
          </h2>
          {dayViews.length + dayMakeups.length === 0 ? (
            <div className="card">
              <p className="muted">수업이 없는 날입니다.</p>
            </div>
          ) : (
            <ul className="list">
              {dayViews.map((view) => (
                <li key={view.key}>
                  <LessonRow view={view} onClick={() => setEditing(view)} />
                </li>
              ))}
              {dayMakeups.map((makeup) => (
                <li key={makeup.id}>
                  <MakeupRow makeup={makeup} onClick={() => setOpenMakeupId(makeup.id)} />
                </li>
              ))}
            </ul>
          )}
          <p className="muted">수업을 눌러 출석, 결석, 휴강을 기록하세요. 기록하지 않은 지난 수업은 출석으로 봅니다.</p>
        </div>
      </div>
      <LessonSheet view={editing} onClose={() => setEditing(null)} />
      <MakeupSheet makeup={openMakeup} onClose={() => setOpenMakeupId(null)} />
    </section>
  )
}
