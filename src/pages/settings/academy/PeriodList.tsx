import type { ReactNode } from 'react'
import DateField from '../../../components/DateField'
import { PlusIcon, TrashIcon } from '../../../components/icons'
import { newId } from '../../../data/id'
import type { Period } from '../../../data/types'
import { addDays, today, type DateStr } from '../../../utils/date'

interface PeriodListProps<T> {
  /** 예: '일정', '수강료' */
  label: string
  periods: Period<T>[]
  startedOn: DateStr
  onChange(periods: Period<T>[]): void
  renderValue(value: T, update: (value: T) => void, index: number): ReactNode
  /** 변경을 추가할 때 이전 설정을 복사하는 방법 */
  copyValue(value: T): T
}

/**
 * 기간별 설정 목록. 보통은 하나지만, 학기 중에 바뀌면 "변경 추가"로 새 기간을 넣습니다.
 * 첫 기간은 수강 시작일부터 적용되고, 다음 기간은 각자의 적용 시작일부터 적용됩니다.
 */
export default function PeriodList<T>({ label, periods, startedOn, onChange, renderValue, copyValue }: PeriodListProps<T>) {
  function update(index: number, patch: Partial<Period<T>>) {
    onChange(periods.map((period, i) => (i === index ? { ...period, ...patch } : period)))
  }

  function add() {
    const last = periods[periods.length - 1]
    const lastStart = periods.reduce((max, period) => (period.startsOn > max ? period.startsOn : max), startedOn)
    const startsOn = today() > lastStart ? today() : addDays(lastStart, 1)
    onChange([...periods, { id: newId(), startsOn, value: copyValue(last.value) }])
  }

  return (
    <>
      {periods.map((period, index) => (
        <div key={period.id} className={periods.length > 1 ? 'period is-multiple' : 'period'}>
          {periods.length > 1 && (
            <div className="period-head">
              {index === 0 ? (
                <span className="period-label">처음 (수강 시작일부터)</span>
              ) : (
                <>
                  <span className="period-label">변경 {index} 적용 시작일</span>
                  <div className="period-date">
                    <DateField label={`${label} 변경 ${index} 적용 시작일`} value={period.startsOn}
                      min={addDays(startedOn, 1)} onChange={(startsOn) => update(index, { startsOn })} />
                    <button type="button" className="icon-btn" aria-label={`${label} 변경 ${index} 삭제`}
                      onClick={() => onChange(periods.filter((_, i) => i !== index))}>
                      <TrashIcon />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {renderValue(period.value, (value) => update(index, { value }), index)}
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-small" onClick={add}>
        <PlusIcon />
        {label} 변경 추가
      </button>
    </>
  )
}
