import { useState } from 'react'
import { useAcademies } from '../data/academies'
import { useChildren } from '../data/children'
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type PaymentView } from '../data/paymentPlan'
import { lastMethod, latestPaidPayment, rememberMethod, usePayments } from '../data/payments'
import type { PaymentMethod } from '../data/types'
import { formatDate, today, type DateStr } from '../utils/date'
import { formatNumber, formatWon, parseAmount } from '../utils/money'
import { objectParticle } from '../utils/korean'
import AmountInput from './AmountInput'
import DateField from './DateField'
import Segmented from './Segmented'
import Sheet from './Sheet'

export const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}))

interface PaymentSheetProps {
  /** 열 납부. null이면 창을 닫습니다. */
  view: PaymentView | null
  onClose(): void
}

/** 납부 하나를 기록하는 창: 금액, 낸 날, 방법, 메모 */
export default function PaymentSheet({ view, onClose }: PaymentSheetProps) {
  return (
    <Sheet open={view !== null} onClose={onClose} label="납부">
      {view && <PaymentEditor key={view.key} view={view} onDone={onClose} />}
    </Sheet>
  )
}

function PaymentEditor({ view, onDone }: { view: PaymentView; onDone(): void }) {
  const { academies } = useAcademies()
  const { children } = useChildren()
  const { payments, pay, unpay, removePayment } = usePayments()
  const academy = academies.find((item) => item.id === view.academyId)
  const child = children.find((item) => item.id === academy?.childId)
  // 앱 등록 전이라 낸 것으로 본 항목은 아직 기록이 없으니 '납부 완료'로 기록할 수 있게 둡니다.
  const paid = view.status === 'paid' && !view.assumed

  // 자동완성: 같은 학원에 지난번 낸 기록이 있으면 금액(미정일 때), 방법, 메모를 미리 채웁니다.
  const previous = view.record ? undefined : latestPaidPayment(payments, view.academyId)
  const [amountText, setAmountText] = useState(
    view.amount ? formatNumber(view.amount) : previous?.amount ? formatNumber(previous.amount) : '',
  )
  const [paidOn, setPaidOn] = useState<DateStr>(view.record?.paidOn ?? today())
  const [method, setMethod] = useState<PaymentMethod>(view.record?.method ?? previous?.method ?? lastMethod())
  const [memo, setMemo] = useState(view.record?.memo ?? previous?.memo ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!academy) return null
  const amount = parseAmount(amountText)
  const name = view.kind === 'tuition' ? view.title : `${PAYMENT_KIND_LABELS[view.kind]}${view.title ? ` · ${view.title}` : ''}`

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

  return (
    <>
      <div className="sheet-header">
        <h2 className="sheet-title">
          <span className="dot" style={{ background: academy.color }} />
          {academy.name}
          {child && children.length > 1 && <span className="muted"> · {child.name}</span>}
        </h2>
        <p className="muted">
          {name} · {formatDate(view.dueOn)}까지
        </p>
        <p>
          <span className={`badge payment-${view.status}${view.assumed ? ' is-assumed' : ''}`}>{PAYMENT_STATUS_LABELS[view.status]}</span>
        </p>
      </div>
      {view.assumed && <p className="note">앱에 학원을 등록하기 전 항목이라 낸 것으로 봅니다. 실제로 낸 날과 금액을 남기려면 기록하세요.</p>}
      {previous?.paidOn && (
        <p className="muted">
          지난번 {formatDate(previous.paidOn)} · {PAYMENT_METHOD_LABELS[previous.method ?? 'transfer']} · {formatWon(previous.amount)}
          {previous.memo && ` · ${previous.memo}`} 을(를) 미리 채웠습니다.
        </p>
      )}

      <div className="field">
        <label className="field-label" htmlFor="payment-amount">금액</label>
        <AmountInput id="payment-amount" value={amountText} onChange={setAmountText} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="payment-paid-on">낸 날</label>
        <DateField id="payment-paid-on" label="낸 날" value={paidOn} onChange={setPaidOn} />
      </div>
      <div className="field">
        <span className="field-label">방법</span>
        <Segmented<PaymentMethod> label="납부 방법" name="payment-method" value={method} onChange={setMethod} options={METHOD_OPTIONS} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="payment-memo">메모 (선택)</label>
        <input id="payment-memo" className="input" value={memo} maxLength={100} autoComplete="off"
          placeholder="예: 형제 할인" onChange={(event) => setMemo(event.target.value)} />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={busy}>닫기</button>
        <button type="button" className="btn btn-primary" disabled={busy || amount === null}
          onClick={() =>
            amount !== null &&
            run(async () => {
              rememberMethod(method)
              await pay(view, { amount, paidOn, method, memo: memo.trim() })
            })
          }>
          {paid ? '수정 저장' : '납부 완료'}
        </button>
      </div>
      <div className="link-actions">
        {paid && (
          <button type="button" className="link-btn" disabled={busy} onClick={() => run(() => unpay(view))}>
            납부 취소
          </button>
        )}
        {!view.planned && view.record && (
          <button type="button" className="link-btn is-danger" disabled={busy}
            onClick={() => {
              if (window.confirm(`'${name}'${objectParticle(name)} 삭제할까요?`)) run(() => removePayment(view.record!.id))
            }}>
            항목 삭제
          </button>
        )}
      </div>
    </>
  )
}
