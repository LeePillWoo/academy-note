import { expect, test } from '@playwright/test'

test('기기가 어두운 모드여도 밝은 화면', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '학원노트에 오신 것을 환영합니다' })).toBeVisible()
  const colors = await page.evaluate(() => ({
    page: getComputedStyle(document.documentElement).backgroundColor,
    card: getComputedStyle(document.querySelector('.card')!).backgroundColor,
  }))
  expect(colors).toEqual({ page: 'rgb(245, 246, 250)', card: 'rgb(255, 255, 255)' })
})
