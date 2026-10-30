import { useAcademies } from '../data/academies'
import { useChildren } from '../data/children'
import { PAYMENT_KIND_LABELS, PAYMENT_STATUS_LABELS, type PaymentView } from '../data/paymentPlan'
import { useSelectedChild } from '../data/SelectedChild'
import { formatDate } from '../utils/date'
import { formatFee, formatWon } from '../utils/money'
import ChildTag from './ChildTag'

/** 납부 한 줄: 학원, 무엇(11월분, 교재비 …), 낼 날, 금액, 상태. 누르면 납부 창을 엽니다. */
export default function PaymentRow({ view, onClick }: { view: PaymentView; onClick(): void }) {
  const { academies } = useAcademies()
  const { children } = useChildren()
  const { selectedChildId } = useSelectedChild()
  const academy = academies.find((item) => item.id === view.academyId)
  if (!academy) return null
  const child = !selectedChildId && children.length > 1 ? children.find((item) => item.id === academy.childId) : undefined
  const what = view.kind === 'tuition' ? view.title : `${PAYMENT_KIND_LABELS[view.kind]}${view.title ? ` · ${view.title}` : ''}`
  const when = view.record?.paidOn
    ? `${formatDate(view.record.paidOn)} 냄`
    : view.assumed
      ? `${formatDate(view.dueOn)} · 앱 등록 전`
      : `${formatDate(view.dueOn)}까지`

  return (
    <button type="button" className="list-row list-button" onClick={onClick}>
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
  )
}
