import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { toMinutes, type TimetableBlock } from '../data/timetable'
import type { Academy, Child } from '../data/types'
import { WEEKDAY_NAMES, WEEKDAYS_FROM_MONDAY, formatDate, type DateStr, type Weekday } from '../utils/date'

interface TimetablePrintSheetProps {
  /** 시간표에 보이는(토글로 고른) 블록만 */
  blocks: TimetableBlock[]
  academies: Academy[]
  childList: Child[]
  colorByChild: boolean
  asOf: DateStr
  /** 제목에 넣을 자녀 이름 */
  titleNames: string[]
}

/**
 * 인쇄용 시간표 (A4 세로 한 장). 화면에서는 숨겨져 있다가 인쇄할 때만 보입니다. (index.css의 @media print)
 * 월~금은 항상, 토·일은 수업이 있을 때만 넣고, 시각은 수업이 있는 범위만 보여줘 한 장에 맞춥니다.
 * 블록에는 요일(열), 시간, 과목(없으면 학원 이름), 자녀가 들어갑니다.
 */
export default function TimetablePrintSheet({ blocks, academies, childList, colorByChild, asOf, titleNames }: TimetablePrintSheetProps) {
  const academyById = new Map(academies.map((academy) => [academy.id, academy]))
  const childById = new Map(childList.map((child) => [child.id, child]))
  const days: Weekday[] = WEEKDAYS_FROM_MONDAY.filter((weekday) => (weekday >= 1 && weekday <= 5) || blocks.some((block) => block.weekday === weekday))
  const startMin = blocks.length ? Math.floor(Math.min(...blocks.map((block) => toMinutes(block.start))) / 60) * 60 : 9 * 60
  let endMin = blocks.length ? Math.ceil(Math.max(...blocks.map((block) => toMinutes(block.end))) / 60) * 60 : 18 * 60
  if (endMin - startMin < 4 * 60) endMin = startMin + 4 * 60
  const hours = Array.from({ length: (endMin - startMin) / 60 }, (_, i) => (startMin + i * 60) / 60)
  const manyChildren = childList.length > 1
  const legendChildren = childList.filter((child) => titleNames.includes(child.name))

  return createPortal(
    <div className="print-sheet" aria-hidden="true">
      <header className="print-head">
        <h1>시간표</h1>
        <p>
          {titleNames.join(' · ')} · {formatDate(asOf, { withYear: true })} 기준 · 학원노트
        </p>
      </header>
      <div className="print-grid" style={{ '--hours': hours.length, '--days': days.length } as CSSProperties}>
        <div className="print-corner" />
        {days.map((weekday) => (
          <div key={weekday} className={`print-day-head wd-${weekday}`}>
            {WEEKDAY_NAMES[weekday]}
          </div>
        ))}
        <div className="print-times">
          {hours.map((hour, i) => (
            <span key={hour} style={{ top: `calc(${i} * var(--print-hour))` }}>
              {hour}:00
            </span>
          ))}
        </div>
        <div className="print-days">
          {blocks.map((block) => {
            const academy = academyById.get(block.academyId)
            if (!academy) return null
            const child = childById.get(academy.childId)
            const dayIndex = days.indexOf(block.weekday)
            const start = toMinutes(block.start)
            const end = toMinutes(block.end)
            const color = (colorByChild ? child?.color : academy.color) ?? '#666666'
            return (
              <div
                key={block.id}
                className="print-block"
                style={
                  {
                    '--c': color,
                    left: `calc(${dayIndex} * 100% / ${days.length} + 0.6mm)`,
                    width: `calc(100% / ${days.length} - 1.2mm)`,
                    top: `calc(${(start - startMin) / 60} * var(--print-hour) + 0.3mm)`,
                    height: `calc(${(end - start) / 60} * var(--print-hour) - 0.6mm)`,
                  } as CSSProperties
                }
              >
                <strong>{academy.subject || academy.name}</strong>
                <span>
                  {block.start}~{block.end}
                </span>
                {academy.subject && <span>{academy.name}</span>}
                {manyChildren && child && <span>{child.name}</span>}
              </div>
            )
          })}
        </div>
      </div>
      {colorByChild && legendChildren.length > 0 && (
        <footer className="print-foot">
          {legendChildren.map((child) => (
            <span key={child.id}>
              <i style={{ background: child.color }} /> {child.name}
            </span>
          ))}
        </footer>
      )}
    </div>,
    document.body,
  )
}
