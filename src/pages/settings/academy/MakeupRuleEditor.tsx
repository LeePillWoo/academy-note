import WeekdaySlotsEditor from '../../../components/WeekdaySlotsEditor'
import type { MakeupRule, MakeupWindow } from '../../../data/types'

interface MakeupRuleEditorProps {
  value: MakeupRule
  onChange(value: MakeupRule): void
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

const WINDOW_OPTIONS: { type: MakeupWindow['type']; label: string }[] = [
  { type: 'days', label: '결석일로부터 며칠 이내' },
  { type: 'sameMonth', label: '같은 달 안' },
  { type: 'nextMonthEnd', label: '다음 달 말까지' },
  { type: 'none', label: '기한 없음' },
]

/** 보강 규칙: 보강 대상, 기간, 횟수 제한, 가능 요일과 시간 */
export default function MakeupRuleEditor({ value, onChange }: MakeupRuleEditorProps) {
  const set = (patch: Partial<MakeupRule>) => onChange({ ...value, ...patch })
  const enabled = value.forAbsence || value.forCancellation

  function setWindowType(type: MakeupWindow['type']) {
    set({ window: type === 'days' ? { type, days: value.window.type === 'days' ? value.window.days : 14 } : { type } })
  }

  return (
    <div className="form-stack">
      <fieldset className="field">
        <legend className="field-label">보강 대상</legend>
        <label className="check-row">
          <input type="checkbox" checked={value.forAbsence} onChange={(event) => set({ forAbsence: event.target.checked })} />
          결석하면 보강
        </label>
        <label className="check-row">
          <input type="checkbox" checked={value.forCancellation}
            onChange={(event) => set({ forCancellation: event.target.checked })} />
          휴강하면 보강
        </label>
      </fieldset>

      {enabled ? (
        <>
          <div className="field">
            <label className="field-label" htmlFor="makeup-window">보강 가능 기간</label>
            <select id="makeup-window" className="input" value={value.window.type}
              onChange={(event) => setWindowType(event.target.value as MakeupWindow['type'])}>
              {WINDOW_OPTIONS.map((option) => (
                <option key={option.type} value={option.type}>{option.label}</option>
              ))}
            </select>
            {value.window.type === 'days' && (
              <select className="input" aria-label="보강 가능 일수" value={value.window.days}
                onChange={(event) => set({ window: { type: 'days', days: Number(event.target.value) } })}>
                {range(1, 60).map((days) => (
                  <option key={days} value={days}>{days}일 이내</option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="makeup-limit">한 달 보강 횟수</label>
            <select id="makeup-limit" className="input" value={value.monthlyLimit ?? 0}
              onChange={(event) => {
                const limit = Number(event.target.value)
                set({ monthlyLimit: limit === 0 ? null : limit })
              }}>
              <option value={0}>제한 없음</option>
              {range(1, 10).map((count) => (
                <option key={count} value={count}>한 달 최대 {count}회</option>
              ))}
            </select>
          </div>

          <div className="field">
            <span className="field-label">보강 가능 요일과 시간 (선택)</span>
            <WeekdaySlotsEditor label="보강" slots={value.slots} onChange={(slots) => set({ slots })}
              defaultStart="10:00" defaultEnd="12:00" />
            <p className="muted">비워두면 아무 요일이나 됩니다. 정해두면 보강 날짜를 잡을 때 맞는지 알려줍니다.</p>
          </div>
        </>
      ) : (
        <p className="muted">이 학원은 보강을 하지 않습니다. 결석해도 보강 항목이 생기지 않습니다.</p>
      )}
    </div>
  )
}
