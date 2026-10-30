import { expect, test } from '@playwright/test'
import { addChildren, addDailyAcademy } from './helpers'

test('알림 설정과 미리보기, 납부 한 번에 체크, 선납, 학원 그만둔 날', async ({ page }, testInfo) => {
  // 11-04(수)에 학원 등록 (10월 1일부터 다님, 납부일 매월 4일, 매일 16:00 수업)
  await page.clock.setFixedTime(new Date('2026-11-04T09:00:00+09:00'))
  await addChildren(page, ['첫째'])
  await addDailyAcademy(page, { name: '수학학원', start: '16:00', end: '17:00', amount: '200000' })

  // 11-06: 11월분이 이틀 지남 → 미납 알림이 오늘부터 매일 (12월분은 12-05부터)
  await page.clock.setFixedTime(new Date('2026-11-06T09:00:00+09:00'))
  await page.goto('/#/settings')
  await expect(page.getByRole('link', { name: /알림/ })).toContainText('3개 켜짐')
  await page.getByRole('link', { name: /알림/ }).click()
  await expect(page.getByRole('heading', { name: '알림', exact: true })).toBeVisible()
  const items = page.locator('.schedule-item')
  await expect(items).toHaveCount(31)
  await expect(items.first()).toContainText('수학학원 학원비 미납')
  await expect(items.first()).toContainText('11월분 20만 원 · 납부일 11월 4일 (수)에서 2일 지남')
  await expect(page.locator('.schedule-date').first()).toContainText('11월 6일 (금)')
  await page.screenshot({ path: testInfo.outputPath('1-notifications.png'), fullPage: true })

  // 등원 알림 켜기 → 수업 60분 전(15:00) 알림이 생김 / 미납 알림 끄기 → 미납 항목 사라짐
  await page.getByRole('switch', { name: '수업 시작 (등원) 알림' }).click()
  await expect(items.filter({ hasText: '수업 60분 전' }).first()).toContainText('15:00')
  await page.getByRole('switch', { name: '학원비 미납 알림' }).click()
  await expect(items.filter({ hasText: '미납' })).toHaveCount(0)

  // 새로고침해도 설정이 남고, 되돌릴 수 있음
  await page.reload()
  await expect(page.getByRole('switch', { name: '학원비 미납 알림' })).not.toBeChecked()
  await expect(page.getByRole('switch', { name: '수업 시작 (등원) 알림' })).toBeChecked()
  await page.getByRole('switch', { name: '학원비 미납 알림' }).click()
  await page.getByRole('switch', { name: '수업 시작 (등원) 알림' }).click()
  await expect(items.filter({ hasText: '미납' }).first()).toBeVisible()

  // 납부 화면에서 동그라미를 눌러 한 번에 납부 완료 → 11월분 미납 알림이 사라짐
  await page.goto('/#/payments')
  const row = page.locator('.payment-row', { hasText: '11월분' })
  await row.getByRole('button', { name: /납부 완료로 체크/ }).click()
  await expect(row).toContainText('납부 완료')
  await expect(row).toContainText('11월 6일 (금) 냄')
  await page.goto('/#/settings/notifications')
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('12월분')

  // 선납: 다음 달 항목을 미리 체크 → (선납) 표시, 알림 없음
  await page.goto('/#/payments')
  await page.getByText('다음 달 납부').click()
  const next = page.locator('.payment-row', { hasText: '12월분' })
  await next.getByRole('button', { name: /납부 완료로 체크/ }).click()
  await expect(next).toContainText('납부 완료')
  await expect(next).toContainText('(선납)')
  await page.screenshot({ path: testInfo.outputPath('2-payments-checked.png'), fullPage: true })
  await page.goto('/#/settings/notifications')
  await expect(page.getByText('앞으로 30일 동안 울릴 알림이 없습니다.')).toBeVisible()

  // 학원 그만둔 날: 오늘(11-06)로 넣으면 내일부터 수업이 없음
  await page.goto('/#/settings/academies')
  await page.getByRole('link', { name: /수학학원/ }).click()
  await page.getByText('이 학원을 그만뒀어요').click()
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.locator('.list-link', { hasText: '수학학원' })).toContainText('그만둠')
  await page.goto('/#/calendar?date=2026-11-07&view=day')
  await expect(page.getByText('수업이 없는 날입니다.')).toBeVisible()
  await page.goto('/#/calendar?date=2026-11-06&view=day')
  await expect(page.locator('.day-mode .list-button')).toHaveCount(1)
})
