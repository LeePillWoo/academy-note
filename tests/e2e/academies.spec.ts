import { expect, test } from '@playwright/test'
import { addChildren, expectNoHorizontalOverflow, toggleWeekdays } from './helpers'

test('학원 추가, 수정(학기 중 일정 변경), 삭제', async ({ page }, testInfo) => {
  await addChildren(page, ['첫째', '둘째'])
  const academyRows = page.locator('.list-link')

  await page.goto('/#/settings/academies')
  await expect(page.getByText('등록된 학원이 없습니다.')).toHaveCount(2)

  // ── 둘째의 수학학원 (월 단위) ──
  await page.getByRole('link', { name: '학원 추가' }).click()
  await page.getByRole('radio', { name: '둘째' }).check()

  // 비워두고 저장하면 오류
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText('학원 이름을 입력하세요.')).toBeVisible()
  await expect(page.getByText('수업 요일을 하나 이상 고르세요.')).toBeVisible()
  await expect(page.getByText('수강료 금액을 입력하세요.')).toBeVisible()

  await page.getByLabel('학원 이름').fill('수학학원')
  await expect(page.getByText('학원 이름을 입력하세요.')).toHaveCount(0)

  // 월요일 시간을 정하면 수·금은 같은 시간으로 채워짐
  await toggleWeekdays(page, '수업', ['월'])
  await page.getByLabel('수업 월요일 시작 시각').fill('17:00')
  await page.getByLabel('수업 월요일 끝 시각').fill('18:30')
  await toggleWeekdays(page, '수업', ['수', '금'])
  await expect(page.getByLabel('수업 금요일 끝 시각')).toHaveValue('18:30')

  // 금액은 쉼표가 붙고 읽기 쉬운 금액이 아래에 나옴
  await page.getByLabel('한 달 금액').fill('250000')
  await expect(page.getByLabel('한 달 금액')).toHaveValue('250,000')
  await expect(page.getByText('25만 원', { exact: true })).toBeVisible()
  await page.getByLabel('납부일').selectOption('5')

  await page.getByLabel('보강 가능 기간').selectOption('sameMonth')
  await page.getByLabel('한 달 보강 횟수').selectOption('2')
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('1-academy-form.png'), fullPage: true })
  await page.getByRole('button', { name: '저장' }).click()

  await expect(academyRows).toHaveCount(1)
  await expect(academyRows.first()).toContainText('수학학원')
  await expect(academyRows.first()).toContainText('월·수·금 17:00~18:30 · 월 25만 원 · 매월 5일')

  // ── 첫째의 영어학원 (회차 단위) ──
  await page.getByRole('link', { name: '학원 추가' }).click()
  await page.getByRole('radio', { name: '첫째' }).check()
  await page.getByLabel('학원 이름').fill('영어학원')
  await toggleWeekdays(page, '수업', ['화', '목'])
  await page.getByRole('radio', { name: '회차 단위' }).check()
  await page.getByLabel('8회 금액').fill('200000')
  await page.getByLabel('지금 묶음에서 이미 들은 회차').selectOption('3')
  await page.getByRole('button', { name: '저장' }).click()

  await expect(academyRows).toHaveCount(2)
  await expect(page.locator('.group').first()).toContainText('영어학원')
  await expect(page.locator('.group').first()).toContainText('화·목 16:00~17:00 · 8회 20만 원')
  await page.screenshot({ path: testInfo.outputPath('2-academy-list.png') })

  // ── 학기 중 일정 변경: 다음 달 1일부터 토요일 추가 ──
  await page.getByRole('link', { name: /영어학원/ }).click()
  await expect(page.getByRole('heading', { name: '학원 수정' })).toBeVisible()
  await expect(page.getByLabel('지금 묶음에서 이미 들은 회차')).toHaveValue('3')
  await page.getByRole('button', { name: '일정 변경 추가' }).click()
  await page.getByRole('button', { name: /일정 변경 1 적용 시작일/ }).click()
  const picker = page.getByRole('dialog', { name: '일정 변경 1 적용 시작일 고르기' })
  await expect(picker).toBeVisible()
  await picker.getByRole('button', { name: '다음 달' }).click()
  await page.screenshot({ path: testInfo.outputPath('3-date-picker.png') })
  await picker.getByRole('button', { name: /월 1일 \(/ }).click()
  await expect(picker).toBeHidden()
  await toggleWeekdays(page, '수업 변경 1', ['토'])
  await expectNoHorizontalOverflow(page)
  await page.getByRole('button', { name: '저장' }).click()

  // 변경은 다음 달부터라 목록의 오늘 기준 일정은 그대로
  await expect(page.locator('.group').first()).toContainText('화·목 16:00~17:00')
  await page.getByRole('link', { name: /영어학원/ }).click()
  await expect(page.getByText('처음 (수강 시작일부터)')).toBeVisible()
  await expect(page.getByRole('group', { name: '수업 변경 1 요일' }).getByRole('button', { name: '토' }))
    .toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '취소' }).click()

  // ── 학원 삭제 ──
  await page.getByRole('link', { name: /수학학원/ }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '학원 삭제' }).click()
  await expect(academyRows).toHaveCount(1)

  // ── 자녀를 지우면 그 자녀의 학원도 함께 지워짐 ──
  await page.goto('/#/settings/children')
  await page.getByRole('link', { name: '첫째' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '자녀 삭제' }).click()
  await page.goto('/#/settings')
  await expect(page.getByRole('link', { name: /학원/ })).toContainText('0곳')
})
