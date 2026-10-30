import { useRef, useState } from 'react'
import { addMonths, dateParts, formatDate, startOfMonth, today, type DateStr } from '../utils/date'
import { BackIcon, CalendarIcon, ChevronRightIcon } from './icons'
import MonthGrid from './MonthGrid'

interface DateFieldProps {
  id?: string
  /** 화면 읽기 프로그램에 읽어줄 이름. 예: '수강 시작일' */
  label: string
  value: DateStr
  onChange(value: DateStr): void
  min?: DateStr
}

/**
 * 날짜 입력. 누르면 앱에서 만든 달력이 열립니다.
 * 브라우저 기본 날짜 입력창은 기기마다 모양이 달라서 쓰지 않습니다.
 */
export default function DateField({ id, label, value, onChange, min }: DateFieldProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [month, setMonth] = useState(() => startOfMonth(value || today()))
  const { year, month: monthNumber } = dateParts(month)
  // 올해 날짜는 연도를 빼서 좁은 칸에서도 한 줄로 보이게 합니다.
  const shown = value ? formatDate(value) : '날짜 선택'

  function open() {
    setMonth(startOfMonth(value || today()))
    dialogRef.current?.showModal()
  }

  function close() {
    dialogRef.current?.close()
  }

  function pick(date: DateStr) {
    onChange(date)
    close()
  }

  return (
    <>
      <button type="button" id={id} className="input date-input" onClick={open} aria-label={`${label} ${shown}`}>
        <span>{shown}</span>
        <CalendarIcon />
      </button>
      {/* 바깥(어두운 부분)을 누르면 닫습니다. */}
      <dialog ref={dialogRef} className="sheet" aria-label={`${label} 고르기`}
        onClick={(event) => event.target === dialogRef.current && close()}>
        <div className="sheet-body">
          <div className="month-nav">
            <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="이전 달">
              <BackIcon />
            </button>
            <strong>{year}년 {monthNumber}월</strong>
            <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="다음 달">
              <ChevronRightIcon />
            </button>
          </div>
          <MonthGrid month={month} selected={value} min={min} onSelect={pick} />
          <div className="sheet-actions">
            <button type="button" className="btn btn-secondary" onClick={close}>
              취소
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => pick(today())}
              disabled={min !== undefined && today() < min}>
              오늘
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
