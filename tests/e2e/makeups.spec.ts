import { expect, test } from '@playwright/test'
import { addChildren, addDailyAcademy, expectNoHorizontalOverflow, pickDate } from './helpers'

// 오늘을 2026-11-04(수) 오전 9시로 고정합니다. 날짜에 따라 결과가 달라지지 않게 하려고.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-04T09:00:00+09:00'))
})

test('보강: 결석하면 생기고, 날짜 잡기(규칙 경고), 완료와 취소, 보강 안 함, 기한 만료', async ({ page }, testInfo) => {
  await addChildren(page, ['첫째'])
  // 10월 1일부터 매일 16:00~17:00, 보강은 토요일 10:00~12:00, 결석일로부터 14일 이내(기본)
  await addDailyAcademy(page, { name: '수학학원', start: '16:00', end: '17:00', makeupDays: ['토'], phone: '02-123-4567' })

  const lessonSheet = page.getByRole('dialog', { name: '수업 기록' })
  const makeupSheet = page.getByRole('dialog', { name: '보강' })
  const dayRows = page.locator('.day-panel .list-button')

  async function markLesson(date: string, status: '출석' | '결석' | '휴강') {
    await page.goto(`/#/calendar?date=${date}`)
    await dayRows.first().click()
    await lessonSheet.getByRole('radio', { name: status }).check()
    await lessonSheet.getByRole('button', { name: '저장' }).click()
    await expect(lessonSheet).toBeHidden()
  }

  // ── 어제(11-03) 결석 → 보강이 생김 (기한 11-17) ──
  await page.goto('/#/calendar?date=2026-11-03')
  await dayRows.first().click()
  await lessonSheet.getByRole('radio', { name: '결석' }).check()
  await expect(lessonSheet.getByText('저장하면 보강 항목이 생깁니다. (기한: 11월 17일 (화)까지 · 13일 남음)')).toBeVisible()
  await lessonSheet.getByRole('button', { name: '저장' }).click()

  // 홈: 남은 보강 1개, 미정
  await page.goto('/')
  const homeMakeups = page.locator('.home-section').nth(1).locator('.list-button')
  await expect(homeMakeups).toHaveCount(1)
  await expect(homeMakeups.first()).toContainText('11월 3일 (화) 결석분 · 11월 17일 (화)까지 · 13일 남음')
  await expect(homeMakeups.first()).toContainText('미정')

  // ── 날짜 잡기: 목요일은 보강 가능 요일이 아니라는 안내 ──
  await homeMakeups.first().click()
  await expect(makeupSheet).toBeVisible()
  await expect(makeupSheet.getByRole('link', { name: '전화하기' })).toHaveAttribute('href', 'tel:021234567')
  await pickDate(page, '보강 날짜', '2026년 11월 5일 (목)')
  await expect(makeupSheet.getByRole('list', { name: '확인할 점' })).toContainText('보강 가능 요일이 아닙니다. (가능: 토 10:00~12:00)')

  // 토요일로 바꾸면 안내가 사라지고 시각은 보강 가능 시간으로 채워짐
  await pickDate(page, '보강 날짜', '2026년 11월 7일 (토)')
  await expect(makeupSheet.getByRole('list', { name: '확인할 점' })).toHaveCount(0)
  await expect(makeupSheet.getByLabel('보강 시작 시각')).toHaveValue('10:00')
  await expect(makeupSheet.getByLabel('보강 끝 시각')).toHaveValue('12:00')
  await page.screenshot({ path: testInfo.outputPath('1-makeup-sheet.png') })
  await makeupSheet.getByRole('button', { name: '날짜 저장' }).click()
  await expect(homeMakeups.first()).toContainText('예정')
  await expect(homeMakeups.first()).toContainText('11월 7일 (토) 10:00 예정')

  // 달력의 11-07에 보강 예정이 보임
  await page.goto('/#/calendar?date=2026-11-07')
  await expect(dayRows.filter({ hasText: '결석분' })).toContainText('예정')
  await expectNoHorizontalOverflow(page)

  // ── 오늘로 바꿔서 다녀왔어요 → 완료, 오늘 달력에 보강 출석 ──
  await dayRows.filter({ hasText: '결석분' }).click()
  await pickDate(page, '보강 날짜', '2026년 11월 4일 (수)')
  await makeupSheet.getByRole('button', { name: '다녀왔어요' }).click()
  await expect(makeupSheet).toBeHidden()
  await page.goto('/#/calendar?date=2026-11-04')
  await expect(dayRows.filter({ hasText: '보강 출석' })).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('2-calendar-makeup-done.png') })

  // 보강 화면: 남은 보강 없음, 지난 보강 1개
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '보강' }).click()
  await expect(page.getByText('남은 보강이 없습니다.', { exact: false })).toBeVisible()
  await expect(page.getByText('지난 보강')).toBeVisible()

  // ── 보강 출석을 눌러 완료 취소 → 다시 예정 ──
  await page.goto('/#/calendar?date=2026-11-04')
  await dayRows.filter({ hasText: '보강 출석' }).click()
  await makeupSheet.getByRole('button', { name: '완료 취소' }).click()
  await expect(dayRows.filter({ hasText: '보강 출석' })).toHaveCount(0)
  await expect(dayRows.filter({ hasText: '결석분' })).toContainText('예정')

  // ── 원래 수업을 출석으로 바꾸면 보강이 지워짐 ──
  await page.goto('/#/calendar?date=2026-11-03')
  await dayRows.first().click()
  await lessonSheet.getByRole('radio', { name: '출석' }).check()
  await expect(lessonSheet.getByText('저장하면 이 수업의 보강이 지워집니다.')).toBeVisible()
  await lessonSheet.getByRole('button', { name: '저장' }).click()
  await page.goto('/#/makeups')
  await expect(page.locator('.list-button')).toHaveCount(0)

  // ── 보강 안 함, 기한 만료 ──
  await markLesson('2026-11-02', '휴강')
  await markLesson('2026-10-14', '결석') // 기한 10-28 → 오늘(11-04) 기준 만료
  await page.goto('/#/makeups')
  await page.locator('.list-button', { hasText: '11월 2일 (월) 휴강분' }).click()
  await makeupSheet.getByRole('button', { name: '보강 안 함' }).click()
  await expect(page.locator('.section-heading', { hasText: '기한 만료' })).toBeVisible()
  await expect(page.locator('.list-button', { hasText: '10월 14일 (수) 결석분' })).toContainText('기한 만료')
  await page.getByText('지난 보강').click()
  await expect(page.locator('.list-button', { hasText: '11월 2일 (월) 휴강분' })).toContainText('보강 안 함')
  await page.screenshot({ path: testInfo.outputPath('3-makeups-page.png'), fullPage: true })
})
