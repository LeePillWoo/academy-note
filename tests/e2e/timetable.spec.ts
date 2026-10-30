import { expect, test, type Page } from '@playwright/test'
import { addChildren, expectNoHorizontalOverflow, toggleWeekdays } from './helpers'

// 오늘을 2026-11-04(수)로 고정합니다.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-04T09:00:00+09:00'))
})

/** 블록을 오른쪽으로 columns칸 끌어 놓습니다. (시각은 그대로) */
async function dragByColumns(page: Page, selector: ReturnType<Page['locator']>, columns: number) {
  // 휴대폰에서는 격자가 옆으로 밀려 있을 수 있으니 블록을 화면 안으로 가져옵니다.
  await selector.scrollIntoViewIfNeeded()
  const daysBox = (await page.locator('.tt-days').boundingBox())!
  const box = (await selector.boundingBox())!
  const col = daysBox.width / 7
  const x = box.x + box.width / 2
  const y = box.y + 10
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + col * columns, y, { steps: 8 })
  await page.mouse.up()
}

test('시간표: 블록 표시, 정보 창, 편집 모드에서 끌어 옮기기, 겹침 안내, 저장', async ({ page }, testInfo) => {
  await addChildren(page, ['첫째', '둘째'])

  // 첫째 수학학원 월·수 17:00~18:30
  await page.goto('/#/settings/academies/new')
  await page.getByRole('radio', { name: '첫째' }).click()
  await page.getByLabel('학원 이름').fill('수학학원')
  await toggleWeekdays(page, '수업', ['월'])
  await page.getByLabel('수업 월요일 시작 시각').fill('17:00')
  await page.getByLabel('수업 월요일 끝 시각').fill('18:30')
  await toggleWeekdays(page, '수업', ['수'])
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name: '학원 추가' })).toHaveCount(0)

  // 둘째 피아노 금 16:00~17:00
  await page.goto('/#/settings/academies/new')
  await page.getByRole('radio', { name: '둘째' }).click()
  await page.getByLabel('학원 이름').fill('피아노')
  await toggleWeekdays(page, '수업', ['금'])
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name: '학원 추가' })).toHaveCount(0)

  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '시간표' }).click()
  const blocks = page.locator('.tt-block')
  await expect(blocks).toHaveCount(3)
  await expect(page.locator('.tt-head.is-today')).toHaveText('수')
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('1-timetable.png') })

  // 블록을 누르면 정보 창
  await blocks.filter({ hasText: '피아노' }).click()
  const info = page.getByRole('dialog', { name: '수업 정보' })
  await expect(info).toContainText('금요일 16:00~17:00')
  await info.getByRole('button', { name: '닫기' }).click()
  await expect(info).toBeHidden()

  // 편집: 월요일 수학학원을 화요일 같은 시각으로
  await page.getByRole('button', { name: '편집' }).click()
  await dragByColumns(page, blocks.filter({ hasText: '수학학원' }).first(), 1)
  await expect(page.locator('.tt-block.is-changed')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /저장/ })).toHaveText('저장 (1)')

  // 화요일 블록을 수요일로 끌면 이미 수업이 있어 안내만 하고 그대로
  await dragByColumns(page, page.locator('.tt-block.is-changed'), 1)
  await expect(page.getByRole('status')).toContainText('수요일에 이미 이 학원 수업이 있습니다.')
  await expect(page.locator('.tt-block.is-changed')).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('2-editing.png') })

  // 저장: 지금 일정 고치기
  await page.getByRole('button', { name: '저장 (1)' }).click()
  const sheet = page.getByRole('dialog', { name: '시간표 변경 적용' })
  await expect(sheet).toContainText('월·수 17:00~18:30 → 화·수 17:00~18:30')
  await sheet.getByRole('radio', { name: '지금 일정 고치기' }).click()
  await sheet.getByRole('button', { name: '적용' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.locator('.tt-block.is-changed')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '편집' })).toBeVisible()

  await page.goto('/#/settings/academies')
  await expect(page.locator('.list-link', { hasText: '수학학원' })).toContainText('화·수 17:00~18:30')
})
