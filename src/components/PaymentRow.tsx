import { useState } from 'react'
import { useAcademies } from '../data/academies'
import { useChildren } from '../data/children'
import { PAYMENT_KIND_LABELS, PAYMENT_STATUS_LABELS, type PaymentView } from '../data/paymentPlan'
import { lastMethod, latestPaidPayment, usePayments } from '../data/payments'
import { useSelectedChild } from '../data/SelectedChild'
import { formatDate, today } from '../utils/date'
import { formatFee, formatWon } from '../utils/money'
import ChildTag from './ChildTag'
import { CheckIcon } from './icons'

/**
 * 납부 한 줄: 학원, 무엇(11월분, 교재비 …), 낼 날, 금액, 상태. 누르면 납부 창을 엽니다.
 * 오른쪽 동그라미를 누르면 오늘 날짜로 바로 납부 완료 체크합니다. (금액 미정이면 창을 열어 금액부터)
 */
export default function PaymentRow({ view, onClick }: { view: PaymentView; onClick(): void }) {
  const { academies } = useAcademies()
  const { children } = useChildren()
  const { selectedChildId } = useSelectedChild()
  const { payments, pay } = usePayments()
  const [busy, setBusy] = useState(false)
  const academy = academies.find((item) => item.id === view.academyId)
  if (!academy) return null
  const child = !selectedChildId && children.length > 1 ? children.find((item) => item.id === academy.childId) : undefined
  const what = view.kind === 'tuition' ? view.title : `${PAYMENT_KIND_LABELS[view.kind]}${view.title ? ` · ${view.title}` : ''}`
  const when = view.record?.paidOn
    ? `${formatDate(view.record.paidOn)} 냄${view.record.paidOn < view.dueOn ? ' (선납)' : ''}`
    : view.assumed
      ? `${formatDate(view.dueOn)} · 앱 등록 전`
      : `${formatDate(view.dueOn)}까지`
  const checked = view.status === 'paid' && !view.assumed

  async function quickCheck() {
    // 자동완성: 금액이 미정이면 지난번 낸 금액을, 방법과 메모도 지난번 것을 씁니다.
    const previous = latestPaidPayment(payments, view.academyId)
    const amount = view.amount || previous?.amount || 0
    // 이미 냈거나(수정은 창에서) 금액을 알 수 없으면 창을 엽니다.
    if (checked || amount === 0) {
      onClick()
      return
    }
    setBusy(true)
    try {
      await pay(view, { amount, paidOn: today(), method: previous?.method ?? lastMethod(), memo: previous?.memo ?? '' })
    } catch {
      window.alert('저장하지 못했습니다. 다시 시도하세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="list-row payment-row">
      <button type="button" className="list-main list-button" onClick={onClick}>
        <span className="dot" style={{ background: academy.color }} />
        <span className="list-text">
          <span className="list-title">
            {child && <ChildTag child={child} />}
            {academy.name}
          </span>
          <span className="list-sub">
            {what} · {when}
          </span>
        </span>
        <span className="amount-col">
          <span className="amount">{view.status === 'paid' ? formatWon(view.amount) : formatFee(view.amount)}</span>
          <span className={`badge payment-${view.status}${view.assumed ? ' is-assumed' : ''}`}>{PAYMENT_STATUS_LABELS[view.status]}</span>
        </span>
      </button>
      <button
        type="button"
        className={checked ? 'check-btn is-checked' : 'check-btn'}
        aria-pressed={checked}
        aria-label={checked ? `${academy.name} ${what} 납부 완료, 누르면 수정` : `${academy.name} ${what} 납부 완료로 체크`}
        disabled={busy}
        onClick={quickCheck}
      >
        <CheckIcon />
      </button>
    </div>
  )
}
