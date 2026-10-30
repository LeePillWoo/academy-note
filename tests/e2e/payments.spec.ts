import { expect, test } from '@playwright/test'
import { addChildren, addDailyAcademy, expectNoHorizontalOverflow, toggleWeekdays } from './helpers'

// 학원은 2026-11-04(수)에 앱에 등록하고(10월 1일부터 다닌 것으로), 2026-11-20(금)에 납부를 확인합니다.
// 월 납부일은 4일(등록한 날짜)입니다.
test('납부: 등록 전은 낸 것으로, 미납과 금액 미정, 납부 완료와 취소, 추가 납부, 회차 현황', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-11-04T09:00:00+09:00'))
  await addChildren(page, ['첫째'])
  await addDailyAcademy(page, { name: '수학학원', start: '16:00', end: '17:00', amount: '200000' })
  // 수강료를 비워도 저장됨 (금액 미정)
  await addDailyAcademy(page, { name: '피아노', start: '18:00', end: '19:00', amount: '' })
  await expect(page.locator('.list-link', { hasText: '피아노' })).toContainText('월 금액 미정 · 매월 4일')

  // 회차 단위 영어학원: 8회마다, 시작 전에 이미 3회 들음
  await page.goto('/#/settings/academies/new')
  await page.getByLabel('학원 이름').fill('영어학원')
  await page.getByRole('button', { name: /수강 시작일/ }).click()
  const picker = page.getByRole('dialog', { name: '수강 시작일 고르기' })
  await picker.getByRole('button', { name: '이전 달' }).click()
  await picker.getByRole('button', { name: /월 1일 \(/ }).click()
  await toggleWeekdays(page, '수업', ['월', '화', '수', '목', '금', '토', '일'])
  await page.getByRole('radio', { name: '회차 단위' }).click()
  await page.getByLabel('8회 금액').fill('160000')
  await page.getByLabel('지금 묶음에서 이미 들은 회차').selectOption('3')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name: '학원 추가' })).toHaveCount(0)

  // ── 11월 20일 ──
  await page.clock.setFixedTime(new Date('2026-11-20T09:00:00+09:00'))
  await page.goto('/#/payments')
  const row = (academy: string, what: string) => page.locator('.list-button', { hasText: academy }).filter({ hasText: what })
  const sheet = page.getByRole('dialog', { name: '납부' })

  // 11월분은 등록 뒤라 납부일 지남, 피아노는 금액 미정
  await expect(row('수학학원', '11월분')).toContainText('20만 원')
  await expect(row('수학학원', '11월분')).toContainText('납부일 지남')
  await expect(row('피아노', '11월분')).toContainText('금액 미정')
  // 10월분은 앱 등록 전이라 낸 것으로 봐서 지난 미납이 없음
  await expect(page.locator('.section-heading', { hasText: '지난 미납' })).toHaveCount(0)

  // 회차 현황: 이미 3회 + 10/1~11/20 매일 51회 = 54회 → 지금 묶음 6/8회, 다음 납부는 11/23
  const progress = page.locator('.progress-row', { hasText: '영어학원' })
  await expect(progress).toContainText('6/8회')
  await expect(progress).toContainText('다음 납부 11월 23일 (월)')
  await page.screenshot({ path: testInfo.outputPath('1-payments.png'), fullPage: true })
  await expectNoHorizontalOverflow(page)

  // 10월: 앱 등록 전 항목은 흐린 '납부 완료'
  await page.getByRole('button', { name: '이전 달' }).click()
  await expect(row('수학학원', '10월분').locator('.badge.is-assumed')).toHaveText('납부 완료')
  await page.getByRole('button', { name: '다음 달' }).click()

  // ── 수학학원 11월분 납부 (금액은 미리 채워져 있음, 카드) ──
  await row('수학학원', '11월분').click()
  await expect(sheet.getByLabel('금액')).toHaveValue('200,000')
  await sheet.getByRole('radio', { name: '카드' }).click()
  await sheet.getByRole('button', { name: '납부 완료' }).click()
  await expect(row('수학학원', '11월분')).toContainText('납부 완료')

  // ── 피아노 11월분: 금액 미정이라 금액을 넣어야 완료 ──
  await row('피아노', '11월분').click()
  await expect(sheet.getByLabel('금액')).toHaveValue('')
  await expect(sheet.getByRole('button', { name: '납부 완료' })).toBeDisabled()
  await sheet.getByLabel('금액').fill('150000')
  await page.screenshot({ path: testInfo.outputPath('2-payment-sheet.png') })
  await sheet.getByRole('button', { name: '납부 완료' }).click()
  await expect(row('피아노', '11월분')).toContainText('15만 원')
  await expect(row('피아노', '11월분')).toContainText('납부 완료')

  // ── 추가 납부: 교재비 3만 원, 이미 냄 ──
  await page.getByRole('button', { name: /추가 납부/ }).click()
  const extra = page.getByRole('dialog', { name: '추가 납부' })
  await extra.getByLabel('학원').selectOption({ label: '수학학원' })
  await extra.getByLabel('이름 (선택)').fill('2학기 교재')
  await extra.getByLabel('금액').fill('30000')
  await extra.getByText('이미 냈어요').click()
  await extra.getByRole('button', { name: '추가' }).click()
  await expect(row('수학학원', '교재비 · 2학기 교재')).toContainText('납부 완료')

  // 11월 합계: 수학 20만 + 피아노 15만 + 교재 3만 + 영어 16만 × 3(11/7, 11/15, 11/23) = 86만, 낸 금액 38만
  await expect(page.locator('.stats')).toContainText('합계86만 원')
  await expect(page.locator('.stats')).toContainText('낸 금액38만 원')

  // ── 납부 취소: 피아노는 다시 금액 미정 ──
  await row('피아노', '11월분').click()
  await sheet.getByRole('button', { name: '납부 취소' }).click()
  await expect(row('피아노', '11월분')).toContainText('금액 미정')

  // 홈: 낼 돈 (납부일 지남 + 일주일 안)
  await page.goto('/')
  const due = page.locator('.home-section', { hasText: '낼 돈' })
  await expect(due).toContainText('피아노')
  await expect(due).toContainText('영어학원')
  await expect(due).not.toContainText('수학학원')
  await page.screenshot({ path: testInfo.outputPath('3-home.png'), fullPage: true })
})
