import { expect, type Page } from '@playwright/test'

/** 설정 > 자녀에서 자녀를 차례로 등록합니다. */
export async function addChildren(page: Page, names: string[]) {
  for (const name of names) {
    await page.goto('/#/settings/children/new')
    await page.getByLabel('이름').fill(name)
    await page.getByRole('button', { name: '저장' }).click()
    await expect(page.getByRole('heading', { name: '자녀 추가' })).toHaveCount(0)
  }
}

/** 요일 단추를 누릅니다. 예: toggleWeekdays(page, '수업', ['월', '수']) */
export async function toggleWeekdays(page: Page, label: string, days: string[]) {
  const group = page.getByRole('group', { name: `${label} 요일` })
  for (const day of days) await group.getByRole('button', { name: day, exact: true }).click()
}

/** 내용이 화면보다 넓어지지 않았는지 검사합니다. 넓어지면 휴대폰 브라우저가 화면 전체를 축소해서 보여줍니다. */
export async function expectNoHorizontalOverflow(page: Page) {
  const { clientWidth, scrollWidth } = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(scrollWidth, '내용이 화면보다 넓습니다').toBeLessThanOrEqual(clientWidth)
}
