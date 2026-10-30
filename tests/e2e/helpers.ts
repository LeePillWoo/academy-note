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

const ALL_DAYS = ['월', '화', '수', '목', '금', '토', '일']

interface DailyAcademyOptions {
  /** 자녀가 2명 이상일 때 고를 자녀 */
  childName?: string
  name: string
  start: string
  end: string
  /** 보강 가능 요일 (기본 시간 10:00~12:00) */
  makeupDays?: string[]
  phone?: string
}

/** 매일 수업하는 학원을 지난달 1일부터 다닌 것으로 등록합니다. (오늘과 어제가 항상 수업일) */
export async function addDailyAcademy(page: Page, options: DailyAcademyOptions) {
  await page.goto('/#/settings/academies/new')
  if (options.childName) await page.getByRole('radio', { name: options.childName }).check()
  await page.getByLabel('학원 이름').fill(options.name)
  await page.getByRole('button', { name: /수강 시작일/ }).click()
  const picker = page.getByRole('dialog', { name: '수강 시작일 고르기' })
  await picker.getByRole('button', { name: '이전 달' }).click()
  await picker.getByRole('button', { name: /월 1일 \(/ }).click()
  await toggleWeekdays(page, '수업', ['월'])
  await page.getByLabel('수업 월요일 시작 시각').fill(options.start)
  await page.getByLabel('수업 월요일 끝 시각').fill(options.end)
  await toggleWeekdays(page, '수업', ALL_DAYS.slice(1))
  await page.getByLabel('한 달 금액').fill('200000')
  if (options.makeupDays) await toggleWeekdays(page, '보강', options.makeupDays)
  if (options.phone) await page.getByLabel('연락처 (선택)').fill(options.phone)
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name: '학원 추가' })).toHaveCount(0)
}

/** 날짜 칸을 눌러 달력 창에서 날짜를 고릅니다. dateLabel 예: '2026년 11월 7일 (토)' */
export async function pickDate(page: Page, fieldLabel: string, dateLabel: string) {
  await page.getByRole('button', { name: new RegExp(`^${fieldLabel}`) }).click()
  const picker = page.getByRole('dialog', { name: `${fieldLabel} 고르기` })
  // 날짜 단추 이름은 '2026년 11월 7일 (토)' 뒤에 ', 오늘' 같은 말이 붙을 수 있어서 앞부분으로 찾습니다.
  await picker.locator(`button[aria-label^="${dateLabel}"]`).click()
  await expect(picker).toBeHidden()
}
