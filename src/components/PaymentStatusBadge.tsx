import { PAYMENT_STATUS_LABELS, type PaymentView } from '../data/paymentPlan'

/**
 * 납부 상태 표시. 자동납부 학원의 항목(기록 없음)은 상태 대신 '자동납부'(냄) / '자동 예정'(아직)으로 보여줍니다.
 * 직접 기록한 항목과 '앱 등록 전' 항목은 지금까지와 같습니다.
 */
export default function PaymentStatusBadge({ view }: { view: PaymentView }) {
  const autoDerived = view.auto && !view.record
  const label = autoDerived ? (view.status === 'paid' ? '자동납부' : '자동 예정') : PAYMENT_STATUS_LABELS[view.status]
  const className = `badge payment-${view.status}${view.assumed ? ' is-assumed' : ''}${autoDerived ? ' is-auto' : ''}`
  return <span className={className}>{label}</span>
}
