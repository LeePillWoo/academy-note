import { expect, test } from '@playwright/test'
import { addChildren } from './helpers'

test('가족 공유: 기본은 혼자 쓰기, 설정 붙여넣기, 코드 형식 검사, 네트워크 안 씀', async ({ page }) => {
  // 혼자 쓰기에서는 구글/Firebase로 나가는 요청이 하나도 없어야 합니다.
  const cloudRequests: string[] = []
  page.on('request', (request) => {
    if (/googleapis\.com|firebase|gstatic\.com/.test(request.url())) cloudRequests.push(request.url())
  })

  await addChildren(page, ['첫째'])
  await page.goto('/#/settings')
  await expect(page.getByRole('link', { name: /가족 공유/ })).toContainText('혼자 쓰기')
  await page.getByRole('link', { name: /가족 공유/ }).click()
  await expect(page.getByText(/지금은 혼자 쓰기입니다/)).toBeVisible()
  await expect(page.getByText('연결 설정이 아직 없습니다')).toBeVisible()

  // 엉뚱한 글자는 거절
  await page.getByLabel('Firebase 설정').fill('아무 글자')
  await page.getByRole('button', { name: '설정 저장' }).click()
  await expect(page.getByText(/설정을 읽지 못했습니다/)).toBeVisible()

  // 콘솔에서 복사한 모양 그대로 붙여넣으면 저장되고 만들기/참여가 나타남
  await page.getByLabel('Firebase 설정').fill('const firebaseConfig = {\n  apiKey: "test-key",\n  projectId: "demo-project",\n  appId: "1:2:web:3",\n};')
  await page.getByRole('button', { name: '설정 저장' }).click()
  await expect(page.getByRole('heading', { name: '가족 코드 만들기' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '가족 코드로 참여' })).toBeVisible()

  // 코드 형식이 틀리면 연결하지 않고 안내만
  await page.getByLabel('받은 코드').fill('ABCD-1234')
  await page.getByRole('button', { name: '참여하기' }).click()
  await expect(page.getByText('코드는 12자입니다. 받은 코드를 다시 확인하세요.')).toBeVisible()

  // 붙여넣은 설정 지우기 → 다시 안내, 여전히 혼자 쓰기
  await page.getByRole('button', { name: '붙여넣은 설정 지우기' }).click()
  await expect(page.getByText('연결 설정이 아직 없습니다')).toBeVisible()
  await page.goto('/#/settings')
  await expect(page.getByRole('link', { name: /가족 공유/ })).toContainText('혼자 쓰기')

  expect(cloudRequests).toEqual([])
})
