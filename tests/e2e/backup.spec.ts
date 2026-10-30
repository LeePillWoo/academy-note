import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { addChildren, addDailyAcademy } from './helpers'

test('백업 내보내기, 합쳐서 가져오기, 덮어써서 가져오기, 잘못된 파일', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-11-04T09:00:00+09:00'))
  await addChildren(page, ['첫째', '둘째'])
  await addDailyAcademy(page, { childName: '첫째', name: '수학학원', start: '16:00', end: '17:00' })

  await page.goto('/#/settings')
  await expect(page.getByRole('link', { name: /백업과 복원/ })).toContainText('아직 백업 없음')
  await page.getByRole('link', { name: /백업과 복원/ }).click()
  await expect(page.getByText(/기록 3개를 파일 하나/)).toBeVisible() // 자녀 2 + 학원 1

  // 내보내기: 브라우저에서는 파일 내려받기
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '백업 파일 내보내기' }).click()])
  expect(download.suggestedFilename()).toBe('academy-note-backup-2026-11-04.json')
  const filePath = testInfo.outputPath('backup.json')
  await download.saveAs(filePath)
  const backup = JSON.parse(readFileSync(filePath, 'utf8'))
  expect(backup.app).toBe('academy-note')
  expect(backup.data.children).toHaveLength(2)
  await expect(page.getByText('마지막 백업: 2026년 11월 4일 (수)')).toBeVisible()

  // 둘째를 지운 뒤 합치기로 가져오면 둘째가 돌아옴
  await page.goto('/#/settings/children')
  await page.getByRole('link', { name: '둘째' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '자녀 삭제' }).click()
  await expect(page.locator('.list-text')).toHaveText(['첫째'])

  await page.goto('/#/settings/backup')
  await page.getByLabel('백업 파일 고르기').setInputFiles(filePath)
  await expect(page.locator('.restore-panel')).toContainText('backup.json')
  await expect(page.locator('.summary-grid')).toContainText('자녀2개')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '합쳐서 가져오기' }).click()
  await expect(page.getByText(/가져왔습니다/)).toBeVisible()
  await page.goto('/#/settings/children')
  await expect(page.locator('.list-text')).toHaveText(['첫째', '둘째'])

  // 셋째를 추가한 뒤 덮어쓰면 백업 그대로(2명)로 돌아감
  await addChildren(page, ['셋째'])
  await page.goto('/#/settings/backup')
  await page.getByLabel('백업 파일 고르기').setInputFiles(filePath)
  await page.getByRole('radio', { name: '덮어쓰기' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '덮어써서 가져오기' }).click()
  await expect(page.getByText(/가져왔습니다/)).toBeVisible()
  await page.goto('/#/settings/children')
  await expect(page.locator('.list-text')).toHaveText(['첫째', '둘째'])

  // 학원노트 파일이 아니면 안내만
  const bad = testInfo.outputPath('bad.json')
  writeFileSync(bad, '{"foo":1}')
  await page.goto('/#/settings/backup')
  await page.getByLabel('백업 파일 고르기').setInputFiles(bad)
  await expect(page.getByText('학원노트 백업 파일이 아닙니다.')).toBeVisible()
  await expect(page.locator('.restore-panel')).toHaveCount(0)
})
