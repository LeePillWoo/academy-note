import { expect, test } from '@playwright/test'

test('자녀 등록, 선택, 순서 변경, 수정, 삭제', async ({ page }, testInfo) => {
  const nav = page.getByRole('navigation', { name: '주 메뉴' })
  const switcher = page.getByRole('group', { name: '자녀 선택' })
  const childNames = page.locator('.list-text')

  // 처음 화면: 자녀 등록 안내
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '학원노트에 오신 것을 환영합니다' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('1-home-empty.png') })
  await page.getByRole('link', { name: '자녀 등록하기' }).click()
  await expect(page.getByRole('heading', { name: '자녀 추가' })).toBeVisible()

  // 이름 없이 저장하면 오류
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText('이름을 입력하세요.')).toBeVisible()

  await page.getByLabel('이름').fill('첫째')
  await page.getByRole('button', { name: '저장' }).click()

  // 홈으로 돌아옴. 자녀가 1명이면 자녀 선택은 보이지 않음
  await expect(page.getByRole('link', { name: '학원 등록하기' })).toBeVisible()
  await expect(switcher).toHaveCount(0)

  // 설정 > 자녀에서 둘째 추가 (색은 초록). 설정은 세로 화면이면 위쪽 톱니, 가로 화면이면 왼쪽 메뉴
  await page.getByRole('link', { name: '설정', exact: true }).click()
  await page.getByRole('link', { name: /^자녀/ }).click()
  await page.getByRole('link', { name: '자녀 추가' }).click()
  await page.getByLabel('이름').fill('둘째')
  await page.getByRole('radio', { name: '초록' }).check()
  await page.screenshot({ path: testInfo.outputPath('2-child-form.png') })
  await page.getByRole('button', { name: '저장' }).click()
  await expect(childNames).toHaveText(['첫째', '둘째'])

  // 자녀가 2명이 되면 위쪽에 자녀 선택이 나타남
  await expect(switcher.getByRole('button')).toHaveText(['전체', '첫째', '둘째'])

  // 순서 바꾸기
  await page.getByRole('button', { name: '둘째 앞으로' }).click()
  await expect(childNames).toHaveText(['둘째', '첫째'])
  await expect(switcher.getByRole('button')).toHaveText(['전체', '둘째', '첫째'])
  await page.screenshot({ path: testInfo.outputPath('3-children-list.png') })

  // 둘째를 고르면 홈에 반영되고, 새로고침해도 데이터와 선택이 유지됨
  await switcher.getByRole('button', { name: '둘째' }).click()
  await nav.getByRole('link', { name: '홈' }).click()
  await expect(page.getByRole('heading', { name: '둘째의 학원' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '둘째의 학원' })).toBeVisible()
  await expect(switcher.getByRole('button', { name: '둘째' })).toHaveAttribute('aria-pressed', 'true')
  await page.screenshot({ path: testInfo.outputPath('4-home-selected.png') })

  // 수정: 첫째 → 민준
  await page.goto('/#/settings/children')
  await page.getByRole('link', { name: '첫째' }).click()
  await expect(page.getByRole('heading', { name: '자녀 수정' })).toBeVisible()
  await page.getByLabel('이름').fill('민준')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(childNames).toHaveText(['둘째', '민준'])

  // 삭제: 고른 자녀(둘째)를 지우면 1명이 되어 자녀 선택이 사라짐
  await page.getByRole('link', { name: '둘째' }).click()
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain("'둘째'를 삭제할까요?")
    await dialog.accept()
  })
  await page.getByRole('button', { name: '자녀 삭제' }).click()
  await expect(childNames).toHaveText(['민준'])
  await expect(switcher).toHaveCount(0)
})
