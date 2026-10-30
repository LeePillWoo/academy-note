import { useState } from 'react'
import { useScopedAcademies } from '../data/academies'
import { useChildren } from '../data/children'
import { PAYMENT_KIND_LABELS } from '../data/paymentPlan'
import { usePayments, type ExtraPaymentInput } from '../data/payments'
import type { PaymentMethod } from '../data/types'
import { today, type DateStr } from '../utils/date'
import { parseAmount } from '../utils/money'
import AmountInput from './AmountInput'
import DateField from './DateField'
import { METHOD_OPTIONS } from './PaymentSheet'
import Segmented from './Segmented'
import Sheet from './Sheet'

type ExtraKind = ExtraPaymentInput['kind']

const KIND_OPTIONS = (['textbook', 'special', 'other'] as const).map((value) => ({ value, label: PAYMENT_KIND_LABELS[value] }))

const TITLE_PLACEHOLDER: Record<ExtraKind, string> = {
  textbook: '예: 1학기 교재',
  special: '예: 겨울방학 특강',
  other: '예: 시험 응시료',
}

/** 교재비, 특강비 같은 추가 납부를 넣는 창 */
export default function ExtraPaymentSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <Sheet open={open} onClose={onClose} label="추가 납부">
      {open && <ExtraPaymentForm onDone={onClose} />}
    </Sheet>
  )
}

function ExtraPaymentForm({ onDone }: { onDone(): void }) {
  const academies = useScopedAcademies()
  const { children } = useChildren()
  const { addExtra } = usePayments()
  const [academyId, setAcademyId] = useState(academies[0]?.id ?? '')
  const [kind, setKind] = useState<ExtraKind>('textbook')
  const [title, setTitle] = useState('')
  const [amountText, setAmountText] = useState('')
  const [dueOn, setDueOn] = useState<DateStr>(today())
  const [alreadyPaid, setAlreadyPaid] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('transfer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const amount = parseAmount(amountText)

  async function save() {
    if (amount === null) {
      setError('금액을 입력하세요.')
      return
    }
    setBusy(true)
    try {
      await addExtra({
        academyId,
        kind,
        title: title.trim(),
        dueOn,
        amount,
        memo: '',
        paid: alreadyPaid ? { paidOn: dueOn, method } : undefined,
      })
      onDone()
    } catch {
      setError('저장하지 못했습니다. 다시 시도하세요.')
      setBusy(false)
    }
  }

  return (
    <>
      <h2 className="sheet-title">추가 납부</h2>
      <div className="field">
        <label className="field-label" htmlFor="extra-academy">학원</label>
        <select id="extra-academy" className="input" value={academyId} onChange={(event) => setAcademyId(event.target.value)}>
          {academies.map((academy) => {
            const child = children.length > 1 ? children.find((item) => item.id === academy.childId) : undefined
            return (
              <option key={academy.id} value={academy.id}>
                {child ? `${academy.name} (${child.name})` : academy.name}
              </option>
            )
          })}
        </select>
      </div>
      <div className="field">
        <span className="field-label">종류</span>
        <Segmented<ExtraKind> label="종류" name="extra-kind" value={kind} onChange={setKind} options={KIND_OPTIONS} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="extra-title">이름 (선택)</label>
        <input id="extra-title" className="input" value={title} maxLength={30} autoComplete="off"
          placeholder={TITLE_PLACEHOLDER[kind]} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="extra-amount">금액</label>
        <AmountInput id="extra-amount" value={amountText} onChange={(value) => {
          setAmountText(value)
          setError('')
        }} placeholder="예: 30,000" />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="extra-due">{alreadyPaid ? '낸 날' : '낼 날'}</label>
        <DateField id="extra-due" label={alreadyPaid ? '낸 날' : '낼 날'} value={dueOn} onChange={setDueOn} />
      </div>
      <label className="check-row">
        <input type="checkbox" checked={alreadyPaid} onChange={(event) => setAlreadyPaid(event.target.checked)} />
        이미 냈어요
      </label>
      {alreadyPaid && (
        <Segmented<PaymentMethod> label="납부 방법" name="extra-method" value={method} onChange={setMethod} options={METHOD_OPTIONS} />
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>취소</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !academyId}>추가</button>
      </div>
    </>
  )
}
