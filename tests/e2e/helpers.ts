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

interface SubjectOptions {
  name: string
  /** 색 이름. 예: '초록' */
  color?: string
  /** 학습 내용. days는 기본(평일)에서 켜고 끌 요일 */
  tasks: { name: string; days?: string[] }[]
}

/** 학습 화면에서 볼 자녀(위에서 고른 자녀, 자녀가 한 명이면 그 자녀)에게 과목과 학습 내용을 등록합니다. */
export async function addSubject(page: Page, options: SubjectOptions) {
  await page.goto('/#/study/subjects/new')
  await page.getByLabel('과목 이름').fill(options.name)
  if (options.color) await page.getByRole('radio', { name: options.color }).check()
  for (let index = 0; index < options.tasks.length; index++) {
    // 새 과목 화면에는 빈 학습 내용 줄이 하나 있습니다.
    if (index > 0) await page.getByRole('button', { name: '학습 내용 추가' }).click()
    const task = options.tasks[index]
    const label = `학습 내용 ${index + 1}`
    await page.getByLabel(`${label} 이름`).fill(task.name)
    if (task.days) await toggleWeekdays(page, label, task.days)
  }
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name: '과목 추가' })).toHaveCount(0)
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
  /** 한 달 금액. 빈 글자면 금액 미정 (기본 200000) */
  amount?: string
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
  const amount = options.amount ?? '200000'
  if (amount) await page.getByLabel('한 달 금액').fill(amount)
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

/**
 * 인쇄 결과(PDF)의 쪽마다 [가로, 세로] 크기(pt). A4 세로는 약 [595, 842], 가로는 [842, 595]입니다.
 * 화면 인쇄 CSS(@page)대로 PDF를 만들어 쪽 수와 용지 방향을 확인합니다. PDF를 못 만드는 환경(창을 띄운 실행)이면 null
 */
export async function printedPageSizes(page: Page, path: string): Promise<[number, number][] | null> {
  const pdf = await page.pdf({ path, preferCSSPageSize: true, printBackground: true }).catch(() => null)
  if (!pdf) return null
  return [...pdf.toString('latin1').matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map(
    (match) => [Math.round(Number(match[1])), Math.round(Number(match[2]))],
  )
}

/** A4 한 장인지, 방향이 맞는지 */
export function expectSingleA4(sizes: [number, number][] | null, orientation: 'portrait' | 'landscape') {
  if (!sizes) return
  expect(sizes, '인쇄가 한 장이어야 합니다').toHaveLength(1)
  const [width, height] = sizes[0]
  expect(orientation === 'portrait' ? width < height : width > height, `A4 ${orientation === 'portrait' ? '세로' : '가로'}`).toBe(true)
}
