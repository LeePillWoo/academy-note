import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import ExtraPaymentSheet from '../components/ExtraPaymentSheet'
import { BackIcon, ChevronRightIcon, PlusIcon } from '../components/icons'
import PageHeader from '../components/PageHeader'
import PaymentRow from '../components/PaymentRow'
import PaymentSheet from '../components/PaymentSheet'
import { useScopedAcademies } from '../data/academies'
import { buildPaymentViews, sessionProgress, type PaymentView } from '../data/paymentPlan'
import { useFeeContext, usePayments } from '../data/payments'
import { addDays, addMonths, dateParts, endOfMonth, formatDate, startOfMonth } from '../utils/date'
import { formatWon } from '../utils/money'

/** 납부: 달마다 낼 것과 낸 것, 합계, 지난 미납, 회차 단위 학원의 진행 상황 */
export default function PaymentsPage() {
  const academies = useScopedAcademies()
  const context = useFeeContext()
  const { payments } = usePayments()
  const thisMonth = startOfMonth(context.todayStr)
  const [month, setMonth] = useState(thisMonth)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [addingExtra, setAddingExtra] = useState(false)

  const from = startOfMonth(month)
  const to = endOfMonth(month)
  const views = useMemo(() => buildPaymentViews(academies, payments, from, to, context), [academies, payments, from, to, context])
  // 이번 달을 볼 때는 지난달까지 내지 않은 것도 위에 모아 보여줍니다.
  const pastUnpaid = useMemo(
    () =>
      month === thisMonth
        ? buildPaymentViews(academies, payments, '0000-01-01', addDays(from, -1), context).filter((view) => view.status === 'overdue')
        : [],
    [month, thisMonth, academies, payments, from, context],
  )
  const progress = useMemo(
    () => academies.flatMap((academy) => {
      const value = sessionProgress(academy, context)
      return value ? [{ academy, ...value }] : []
    }),
    [academies, context],
  )

  // 이번 달을 볼 때는 다음 달 항목도 아래에 두어 미리(선납) 체크할 수 있게 합니다.
  const nextMonthViews = useMemo(() => {
    if (month !== thisMonth) return []
    const next = addMonths(month, 1)
    return buildPaymentViews(academies, payments, startOfMonth(next), endOfMonth(next), context)
  }, [month, thisMonth, academies, payments, context])

  // 저장한 뒤에도 최신 내용으로 보이도록 열쇠로 다시 찾습니다.
  const opened: PaymentView | null = [...pastUnpaid, ...views, ...nextMonthViews].find((view) => view.key === openKey) ?? null
  const total = views.reduce((sum, view) => sum + view.amount, 0)
  const paidTotal = views.filter((view) => view.status === 'paid').reduce((sum, view) => sum + view.amount, 0)
  const { year, month: monthNumber } = dateParts(month)

  if (academies.length === 0) {
    return (
      <section className="narrow">
        <PageHeader title="납부" subtitle="학원비 낸 것과 낼 것을 관리하세요." />
        <div className="card">
          <p>등록된 학원이 없습니다.</p>
          <Link to="/settings/academies/new" className="btn btn-primary">
            <PlusIcon />
            학원 등록하기
          </Link>
        </div>
      </section>
    )
  }

  const renderList = (list: PaymentView[]) => (
    <ul className="list">
      {list.map((view) => (
        <li key={view.key}>
          <PaymentRow view={view} onClick={() => setOpenKey(view.key)} />
        </li>
      ))}
    </ul>
  )

  return (
    <section className="narrow">
      <PageHeader title="납부" subtitle="학원비 낸 것과 낼 것을 관리하세요." />

      <div className="card">
        <div className="month-nav">
          <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="이전 달">
            <BackIcon />
          </button>
          <strong>{year}년 {monthNumber}월</strong>
          <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="다음 달">
            <ChevronRightIcon />
          </button>
        </div>
        <dl className="stats" aria-label={`${monthNumber}월 합계`}>
          <div>
            <dt>합계</dt>
            <dd>{formatWon(total)}</dd>
          </div>
          <div>
            <dt>낸 금액</dt>
            <dd>{formatWon(paidTotal)}</dd>
          </div>
          <div>
            <dt>남은 금액</dt>
            <dd className={total - paidTotal > 0 ? 'is-due' : undefined}>{formatWon(total - paidTotal)}</dd>
          </div>
        </dl>
      </div>

      {pastUnpaid.length > 0 && (
        <div className="home-section">
          <h2 className="section-heading">지난 미납 <span className="muted">{pastUnpaid.length}개</span></h2>
          {renderList(pastUnpaid)}
        </div>
      )}

      <div className="home-section">
        <h2 className="section-heading">{monthNumber}월 납부 <span className="muted">{views.length}개</span></h2>
        {views.length === 0 ? (
          <div className="card">
            <p className="muted">이 달에 낼 항목이 없습니다.</p>
          </div>
        ) : (
          renderList(views)
        )}
      </div>

      {nextMonthViews.length > 0 && (
        <details className="home-section">
          <summary className="section-heading summary">
            다음 달 납부 <span className="muted">{nextMonthViews.length}개 · 미리 내면 여기서 체크</span>
          </summary>
          {renderList(nextMonthViews)}
        </details>
      )}

      {progress.length > 0 && (
        <div className="home-section">
          <h2 className="section-heading">회차 현황</h2>
          <ul className="list">
            {progress.map(({ academy, used, total: count, nextDueOn, undecidedMakeups }) => (
              <li key={academy.id} className="list-row progress-row">
                <span className="dot" style={{ background: academy.color }} />
                <span className="list-text">
                  <span className="list-title">{academy.name}</span>
                  <span className="list-sub">
                    {nextDueOn ? `다음 납부 ${formatDate(nextDueOn)}` : '다음 납부일 계산 중'}
                    {undecidedMakeups > 0 && ` · 보강 미정 ${undecidedMakeups}개 (결과에 따라 회차가 바뀜)`}
                  </span>
                  <span className="progress" aria-hidden="true">
                    <span style={{ width: `${(used / count) * 100}%` }} />
                  </span>
                </span>
                <span className="amount">{used}/{count}회</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="btn btn-secondary btn-block" onClick={() => setAddingExtra(true)}>
        <PlusIcon />
        추가 납부 (교재비, 특강비)
      </button>

      <PaymentSheet view={opened} onClose={() => setOpenKey(null)} />
      <ExtraPaymentSheet open={addingExtra} onClose={() => setAddingExtra(false)} />
    </section>
  )
}
