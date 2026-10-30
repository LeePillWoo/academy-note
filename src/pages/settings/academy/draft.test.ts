import { describe, expect, it } from 'vitest'
import { newAcademyDraft, validateDraft, type AcademyDraft } from './draft'

function validDraft(): AcademyDraft {
  const draft = newAcademyDraft('child-1', '#3b82f6')
  draft.name = ' 수학학원 '
  draft.startedOn = '2026-10-01'
  draft.schedules[0].value = [{ weekday: 1, start: '17:00', end: '18:30' }]
  draft.fees[0].value.amountText = '250,000'
  draft.fees[0].value.dueDay = 5
  return draft
}

describe('학원 입력 검사', () => {
  it('올바른 입력은 저장할 내용으로 바뀜', () => {
    const { errors, input } = validateDraft(validDraft())
    expect(errors).toEqual({})
    expect(input?.name).toBe('수학학원')
    expect(input?.fees[0].value).toEqual({ type: 'monthly', amount: 250_000, dueDay: 5 })
  })

  it('이름, 요일이 없으면 오류', () => {
    const draft = validDraft()
    draft.name = '  '
    draft.schedules[0].value = []
    const { errors, input } = validateDraft(draft)
    expect(input).toBeUndefined()
    expect(errors.name).toBe('학원 이름을 입력하세요.')
    expect(errors.schedules).toBe('수업 요일을 하나 이상 고르세요.')
  })

  it('수강료 금액은 비워도 저장됨 (0 = 금액 미정)', () => {
    const draft = validDraft()
    draft.fees[0].value.amountText = ''
    const { errors, input } = validateDraft(draft)
    expect(errors).toEqual({})
    expect(input?.fees[0].value).toEqual({ type: 'monthly', amount: 0, dueDay: 5 })
  })

  it('끝 시각이 시작 시각보다 빠르면 오류', () => {
    const draft = validDraft()
    draft.schedules[0].value = [{ weekday: 1, start: '18:00', end: '17:00' }]
    expect(validateDraft(draft).errors.schedules).toBe('끝 시각은 시작 시각보다 늦어야 합니다.')
  })

  it('변경 기간의 시작일은 수강 시작일보다 뒤여야 함', () => {
    const draft = validDraft()
    draft.schedules.push({ id: 'p2', startsOn: '2026-09-01', value: [{ weekday: 2, start: '17:00', end: '18:00' }] })
    expect(validateDraft(draft).errors.schedules).toBe('변경 적용 시작일은 수강 시작일보다 뒤여야 합니다.')
  })

  it('회차 단위: 이미 들은 회차는 첫 기간에만 남고 회차 수보다 작게', () => {
    const draft = validDraft()
    draft.fees[0].value = { ...draft.fees[0].value, type: 'sessions', sessionCount: 8, usedAtStart: 12 }
    draft.fees.push({ id: 'f2', startsOn: '2027-01-01', value: { ...draft.fees[0].value, usedAtStart: 3 } })
    const { input } = validateDraft(draft)
    expect(input?.fees[0].value).toMatchObject({ type: 'sessions', usedAtStart: 7 })
    expect(input?.fees[1].value).toMatchObject({ type: 'sessions', usedAtStart: 0 })
  })
})
