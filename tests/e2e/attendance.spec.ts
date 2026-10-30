import { expect, test, type Page } from '@playwright/test'
import { addChildren, addDailyAcademy, expectNoHorizontalOverflow } from './helpers'

/** 브라우저 기준 어제 날짜 'YYYY-MM-DD' */
function yesterdayIn(page: Page) {
  return page.evaluate(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
}

test('출석 체크: 오늘 결석 기록, 지난 수업 자동 출석, 휴강 기록과 지우기, 자녀별 보기', async ({ page }, testInfo) => {
  await addChildren(page, ['첫째', '둘째'])
  await addDailyAcademy(page, { childName: '첫째', name: '수학학원', start: '16:00', end: '17:00' })
  await addDailyAcademy(page, { childName: '둘째', name: '피아노', start: '18:00', end: '19:00' })
  const sheet = page.getByRole('dialog', { name: '수업 기록' })

  // 홈: 오늘 수업 두 개 (전체 보기라 자녀 태그가 붙음)
  await page.goto('/')
  const todayRows = page.locator('.home-section').first().locator('.list-button')
  await expect(todayRows).toHaveCount(2)
  await expect(todayRows.first()).toContainText('수학학원')
  await expect(todayRows.first().locator('.child-tag')).toHaveText('첫째')
  await expect(todayRows.first()).toContainText('예정')

  // 오늘 수학학원 결석 기록
  await todayRows.first().click()
  await expect(sheet).toBeVisible()
  await sheet.getByRole('radio', { name: '결석' }).check()
  await sheet.getByLabel('메모 (선택)').fill('감기')
  await page.screenshot({ path: testInfo.outputPath('1-lesson-sheet.png') })
  await sheet.getByRole('button', { name: '저장' }).click()
  await expect(sheet).toBeHidden()
  await expect(todayRows.first()).toContainText('결석')
  await expect(todayRows.first()).toContainText('감기')
  await page.screenshot({ path: testInfo.outputPath('2-home-today.png') })

  // 달력(전체): 오늘 칸에 자녀 태그 두 개, 결석한 첫째는 속이 빈 태그
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '달력' }).click()
  const todayCell = page.locator('.is-calendar .day.is-today')
  await expect(todayCell.locator('.mini-tag')).toHaveText(['첫', '둘'])
  await expect(todayCell.locator('.mini-tag.is-missed')).toHaveText('첫')
  await expect(page.locator('.calendar-legend')).toContainText('첫째')
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('2b-calendar-tags.png') })

  // 자녀 하나를 고르면 태그 대신 학원 점
  await page.getByRole('group', { name: '자녀 선택' }).getByRole('button', { name: '첫째' }).click()
  await expect(todayCell.locator('.mini-tag')).toHaveCount(0)
  await expect(todayCell.locator('.day-dot.is-missed')).toHaveCount(1)
  await page.getByRole('group', { name: '자녀 선택' }).getByRole('button', { name: '전체' }).click()

  // 어제: 기록하지 않았으니 출석(자동)
  await page.goto(`/#/calendar?date=${await yesterdayIn(page)}`)
  const dayRows = page.locator('.day-panel .list-button')
  await expect(dayRows).toHaveCount(2)
  await expect(dayRows.first().locator('.badge.is-assumed')).toHaveText('출석')
  await page.screenshot({ path: testInfo.outputPath('3-calendar.png') })

  // 어제 수학학원을 휴강으로
  await dayRows.first().click()
  await expect(sheet.getByText('기록하지 않은 지난 수업은 출석으로 봅니다.')).toBeVisible()
  await expect(sheet.getByRole('radio', { name: '출석' })).toBeChecked()
  await sheet.getByRole('radio', { name: '휴강' }).check()
  await sheet.getByRole('button', { name: '저장' }).click()
  await expect(dayRows.first().locator('.badge')).toHaveText('휴강')

  // 새로고침해도 남아 있고, 기록을 지우면 다시 출석(자동)
  await page.reload()
  await expect(dayRows.first().locator('.badge')).toHaveText('휴강')
  await dayRows.first().click()
  await sheet.getByRole('button', { name: '기록 지우기' }).click()
  await expect(dayRows.first().locator('.badge.is-assumed')).toHaveText('출석')

  // 둘째만 보면 피아노만
  await page.getByRole('group', { name: '자녀 선택' }).getByRole('button', { name: '둘째' }).click()
  await expect(dayRows).toHaveCount(1)
  await expect(dayRows.first()).toContainText('피아노')
  await expect(dayRows.first().locator('.child-tag')).toHaveCount(0)
})
