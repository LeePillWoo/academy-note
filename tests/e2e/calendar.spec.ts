import { expect, test } from '@playwright/test'
import { addChildren, addDailyAcademy, expectNoHorizontalOverflow } from './helpers'

// 오늘을 2026-11-04(수)로 고정합니다.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-04T09:00:00+09:00'))
})

test('달력: 칸에 일정 칩, 월·주·일 탭과 이동, 보기 방식 기억', async ({ page }, testInfo) => {
  await addChildren(page, ['첫째', '둘째'])
  await addDailyAcademy(page, { childName: '첫째', name: '수학학원', start: '16:00', end: '17:00' })
  await addDailyAcademy(page, { childName: '둘째', name: '피아노', start: '18:00', end: '19:00' })

  const title = page.locator('.calendar-toolbar .month-nav strong')

  // ── 월: 칸 안에 학원 이름 칩이 바로 보임 ──
  await page.goto('/#/calendar')
  await expect(page.getByRole('radio', { name: '월' })).toBeChecked()
  await expect(title).toHaveText('2026년 11월')
  const todayChips = page.locator('.is-calendar .day.is-today .cal-chip')
  await expect(todayChips).toHaveCount(2)
  await expect(todayChips.first()).toContainText('수학학원')
  await expect(todayChips.last()).toContainText('피아노')
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('1-month.png'), fullPage: true })

  // ── 주: 일요일부터 7일 ──
  await page.getByRole('radio', { name: '주' }).click()
  await expect(title).toHaveText('11월 1일 ~ 7일')
  const days = page.locator('.week-day')
  await expect(days).toHaveCount(7)
  await expect(days.first().locator('.day-title')).toContainText('11월 1일 (일)')
  await expect(days.nth(3).locator('.list-button')).toHaveCount(2)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('2-week.png'), fullPage: true })
  await page.getByRole('button', { name: '다음 주' }).click()
  await expect(title).toHaveText('11월 8일 ~ 14일')

  // ── 일: 하루 ──
  await page.getByRole('radio', { name: '일' }).click()
  await expect(title).toHaveText('2026년 11월 11일 (수)')
  await page.getByRole('button', { name: '이전 날' }).click()
  await expect(title).toHaveText('2026년 11월 10일 (화)')
  await expect(page.locator('.day-mode .list-button')).toHaveCount(2)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('3-day.png') })

  // 오늘로
  await page.getByRole('button', { name: '오늘로' }).click()
  await expect(title).toHaveText('2026년 11월 4일 (수)')

  // 주소 없이 다시 열어도 마지막 보기 방식(일)으로
  await page.goto('/#/calendar')
  await expect(page.getByRole('radio', { name: '일' })).toBeChecked()

  // 다른 달로 넘기기 (월)
  await page.getByRole('radio', { name: '월' }).click()
  await page.getByRole('button', { name: '다음 달' }).click()
  await expect(title).toHaveText('2026년 12월')
})
