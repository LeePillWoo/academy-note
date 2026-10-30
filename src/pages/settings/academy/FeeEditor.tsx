import DateField from '../../../components/DateField'
import Segmented from '../../../components/Segmented'
import { ABSENCE_COUNTING_LABELS, FEE_PLAN_LABELS } from '../../../data/academyRules'
import type { AbsenceCounting, FeePlanType } from '../../../data/types'
import { formatNumber, formatWon, parseAmount } from '../../../utils/money'
import type { FeeDraft } from './draft'

interface FeeEditorProps {
  /** 입력칸 id 앞에 붙는 글자 (기간마다 다르게) */
  idPrefix: string
  value: FeeDraft
  onChange(value: FeeDraft): void
  /** 첫 기간만 "이미 들은 회차"를 넣습니다. */
  isFirst: boolean
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** 수강료 방식 하나를 입력합니다. (월 / 회차 / 기간 단위) */
export default function FeeEditor({ idPrefix, value, onChange, isFirst }: FeeEditorProps) {
  const set = (patch: Partial<FeeDraft>) => onChange({ ...value, ...patch })
  const amount = parseAmount(value.amountText)

  return (
    <div className="form-stack">
      <Segmented<FeePlanType>
        label="수강료 방식"
        name={`${idPrefix}-type`}
        value={value.type}
        onChange={(type) => set({ type })}
        options={(['monthly', 'sessions', 'period'] as const).map((type) => ({ value: type, label: FEE_PLAN_LABELS[type] }))}
      />

      <div className="field">
        <label className="field-label" htmlFor={`${idPrefix}-amount`}>
          {value.type === 'monthly' ? '한 달 금액' : value.type === 'sessions' ? `${value.sessionCount}회 금액` : `${value.months}개월 금액`}
        </label>
        <div className="input-with-unit">
          <input
            id={`${idPrefix}-amount`}
            className="input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="예: 250,000"
            value={value.amountText}
            // 입력하는 대로 쉼표를 넣어 자릿수를 읽기 쉽게 합니다.
            onChange={(event) => {
              const parsed = parseAmount(event.target.value)
              set({ amountText: parsed === null ? '' : formatNumber(parsed) })
            }}
          />
          <span className="unit">원</span>
        </div>
        {amount !== null && amount >= 10_000 && <p className="muted">{formatWon(amount)}</p>}
      </div>

      {value.type === 'monthly' && (
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-due-day`}>납부일</label>
          <select id={`${idPrefix}-due-day`} className="input" value={value.dueDay}
            onChange={(event) => set({ dueDay: Number(event.target.value) })}>
            {range(1, 30).map((day) => (
              <option key={day} value={day}>매월 {day}일</option>
            ))}
            <option value={31}>매월 말일</option>
          </select>
          <p className="muted">그 달에 없는 날(예: 2월 30일)이면 말일에 냅니다.</p>
        </div>
      )}

      {value.type === 'sessions' && (
        <>
          <div className="field">
            <label className="field-label" htmlFor={`${idPrefix}-session-count`}>몇 회마다 내나요?</label>
            <select id={`${idPrefix}-session-count`} className="input" value={value.sessionCount}
              onChange={(event) => set({ sessionCount: Number(event.target.value) })}>
              {range(1, 30).map((count) => (
                <option key={count} value={count}>{count}회마다</option>
              ))}
            </select>
            <p className="muted">새 묶음의 첫 수업일을 납부일로 잡습니다.</p>
          </div>
          <div className="field">
            <label className="field-label" htmlFor={`${idPrefix}-absence`}>결석한 회차</label>
            <select id={`${idPrefix}-absence`} className="input" value={value.absenceCounting}
              onChange={(event) => set({ absenceCounting: event.target.value as AbsenceCounting })}>
              {(Object.keys(ABSENCE_COUNTING_LABELS) as AbsenceCounting[]).map((key) => (
                <option key={key} value={key}>{ABSENCE_COUNTING_LABELS[key]}</option>
              ))}
            </select>
          </div>
          {isFirst && (
            <div className="field">
              <label className="field-label" htmlFor={`${idPrefix}-used`}>지금 묶음에서 이미 들은 회차</label>
              <select id={`${idPrefix}-used`} className="input" value={Math.min(value.usedAtStart, value.sessionCount - 1)}
                onChange={(event) => set({ usedAtStart: Number(event.target.value) })}>
                {range(0, value.sessionCount - 1).map((count) => (
                  <option key={count} value={count}>{count === 0 ? '없음 (새 묶음부터 시작)' : `${count}회`}</option>
                ))}
              </select>
              <p className="muted">수강 시작일 전에 이미 들은 회차를 넣으면 남은 회차를 맞게 계산합니다.</p>
            </div>
          )}
        </>
      )}

      {value.type === 'period' && (
        <>
          <div className="field">
            <label className="field-label" htmlFor={`${idPrefix}-months`}>몇 개월마다 내나요?</label>
            <select id={`${idPrefix}-months`} className="input" value={value.months}
              onChange={(event) => set({ months: Number(event.target.value) })}>
              {range(1, 12).map((months) => (
                <option key={months} value={months}>{months}개월마다</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor={`${idPrefix}-first-due`}>첫 납부일</label>
            <DateField id={`${idPrefix}-first-due`} label="첫 납부일" value={value.firstDueOn}
              onChange={(firstDueOn) => set({ firstDueOn })} />
            <p className="muted">이후 {value.months}개월마다 같은 날에 냅니다.</p>
          </div>
        </>
      )}
    </div>
  )
}
