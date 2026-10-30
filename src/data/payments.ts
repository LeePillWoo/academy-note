import { useMemo } from 'react'
import { today, type DateStr } from '../utils/date'
import { useData } from './DataProvider'
import { newId, nowIso } from './id'
import type { FeeContext, PaymentView } from './paymentPlan'
import type { Payment, PaymentKind, PaymentMethod } from './types'

export interface PaidInput {
  amount: number
  paidOn: DateStr
  method: PaymentMethod
  memo: string
}

export interface ExtraPaymentInput {
  academyId: string
  kind: Exclude<PaymentKind, 'tuition'>
  title: string
  dueOn: DateStr
  amount: number
  memo: string
  /** 이미 냈으면 낸 날과 방법 */
  paid?: { paidOn: DateStr; method: PaymentMethod }
}

/** 납부 기록과 바꾸는 기능 */
export function usePayments() {
  const { data, apply } = useData()

  async function put(item: Payment) {
    await apply([{ type: 'put', collection: 'payments', item }])
  }

  /** 냈다고 기록합니다. 이미 냈으면 고칩니다. */
  async function pay(view: PaymentView, input: PaidInput) {
    const now = nowIso()
    await put(
      view.record
        ? { ...view.record, ...input, updatedAt: now }
        : {
            id: newId(),
            academyId: view.academyId,
            kind: view.kind,
            dueKey: view.planned ? view.key : undefined,
            title: view.title,
            dueOn: view.dueOn,
            ...input,
            createdAt: now,
            updatedAt: now,
          },
    )
  }

  /** 납부를 취소합니다. 수강료 항목은 처음 상태로, 추가 납부는 안 낸 상태로 돌아갑니다. */
  async function unpay(view: PaymentView) {
    if (!view.record) return
    if (view.planned) {
      await apply([{ type: 'remove', collection: 'payments', id: view.record.id }])
      return
    }
    const { paidOn: _paidOn, method: _method, ...rest } = view.record
    await put({ ...rest, updatedAt: nowIso() })
  }

  /** 교재비, 특강비 같은 추가 납부를 넣습니다. */
  async function addExtra(input: ExtraPaymentInput) {
    const now = nowIso()
    const { paid, ...fields } = input
    await put({ id: newId(), ...fields, ...(paid ?? {}), createdAt: now, updatedAt: now })
  }

  async function removePayment(id: string) {
    await apply([{ type: 'remove', collection: 'payments', id }])
  }

  return { payments: data.payments, pay, unpay, addExtra, removePayment }
}

/** 이 학원에 가장 최근에 낸 기록. 납부 창과 한 번에 체크의 자동완성(금액·방법·메모)에 씁니다. */
export function latestPaidPayment(payments: Payment[], academyId: string): Payment | undefined {
  return payments
    .filter((payment) => payment.academyId === academyId && payment.paidOn)
    .sort((a, b) => `${b.paidOn}${b.updatedAt}`.localeCompare(`${a.paidOn}${a.updatedAt}`))[0]
}

/** 이 학원·종류로 가장 최근에 넣은 기록 (안 낸 것 포함). 추가 납부 자동완성에 씁니다. */
export function latestPayment(payments: Payment[], academyId: string, kind: PaymentKind): Payment | undefined {
  return payments
    .filter((payment) => payment.academyId === academyId && payment.kind === kind)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
}

const METHOD_KEY = 'academy-note:last-payment-method'

/** 마지막으로 쓴 납부 방법을 기억해 두었다가 다음 납부의 기본값으로 씁니다. */
export function rememberMethod(method: PaymentMethod) {
  localStorage.setItem(METHOD_KEY, method)
}

export function lastMethod(): PaymentMethod {
  const value = localStorage.getItem(METHOD_KEY)
  return value === 'card' || value === 'transfer' || value === 'cash' || value === 'other' ? value : 'transfer'
}

/** 수강료 계산에 필요한 기록(수업, 보강, 오늘) */
export function useFeeContext(): FeeContext {
  const { data } = useData()
  const todayStr = today()
  return useMemo(() => ({ lessons: data.lessons, makeups: data.makeups, todayStr }), [data.lessons, data.makeups, todayStr])
}
