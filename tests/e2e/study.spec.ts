import { expect, test } from '@playwright/test'
import { addChildren, addSubject, expectNoHorizontalOverflow, expectSingleA4, printedPageSizes } from './helpers'

// 학습 화면 (예전 '학습체크' 앱에서 옮김). 주간 학습 보드, 과목, 홈의 오늘 학습

test('체크표: 과목과 학습 내용 등록, 요일 체크, 지난주 놓침 표시, 자녀별 분리', async ({ page }, testInfo) => {
  const board = page.getByRole('table')
  const viewPicker = page.getByRole('radiogroup', { name: '보기 방식' })
  const weekBadge = page.locator('.week-badge')
  const summaryDone = page.locator('.week-summary strong')

  await addChildren(page, ['첫째'])
  await page.goto('/#/study')
  await expect(page.getByRole('heading', { name: '학습', exact: true })).toBeVisible()
  await expect(page.getByText('아직 과목이 없습니다.')).toBeVisible()

  // 과목 추가: 문제집은 기본(평일), 연산은 토·일도 켜서 매일
  await addSubject(page, { name: '수학', tasks: [{ name: '문제집 2쪽' }, { name: '연산 10분', days: ['토', '일'] }] })
  await page.goto('/#/study/subjects')
  await expect(page.getByRole('link', { name: '수학 학습 내용 2개' })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  // 기본은 요일별. 이 테스트는 체크표를 봅니다.
  await page.goto('/#/study')
  await viewPicker.getByRole('radio', { name: '체크표' }).click()
  await expect(page.locator('.check-table')).toBeVisible()

  // 보드: 요일 줄, 과목 띠, 학습 내용 줄
  await expect(weekBadge).toHaveText('이번 주')
  await expect(page.getByRole('link', { name: '수학 과목 설정' })).toBeVisible()
  await expect(board.getByRole('rowheader', { name: '문제집 2쪽' })).toBeVisible()
  await expect(board.getByRole('rowheader', { name: '연산 10분' })).toBeVisible()
  await expect(page.locator('.day-head')).toHaveCount(7)
  await expect(page.locator('.board-head .is-today')).toHaveCount(1)
  // 계획 칸: 평일 5 + 매일 7 = 12
  await expect(page.locator('.check-cell.is-planned')).toHaveCount(12)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('1-board.png') })

  // 오늘 칸 체크 (연산은 매일 계획이라 어느 요일에 테스트해도 '미완료')
  await page.getByRole('button', { name: /^연산 10분 .* 오늘 미완료$/ }).click()
  const checkedToday = page.getByRole('button', { name: /^연산 10분 .* 오늘 완료$/ })
  await expect(checkedToday).toHaveAttribute('aria-pressed', 'true')
  await expect(summaryDone).toHaveText('1')

  // 새로고침해도 체크와 보기 방식(체크표)이 유지되고, 다시 누르면 취소
  await page.reload()
  await expect(page.locator('.check-table')).toBeVisible()
  await expect(checkedToday).toBeVisible()
  await checkedToday.click()
  await expect(summaryDone).toHaveText('0')

  // 지난주: 계획한 칸이 모두 지났으니 전부 '놓침'(옅은 분홍)
  await page.getByRole('button', { name: '지난주' }).click()
  await expect(weekBadge).toHaveCount(0)
  await expect(page.locator('.check-cell.is-missed')).toHaveCount(12)
  // 지난 칸도 체크할 수 있고, 체크하면 놓침이 풀림
  await page.locator('.check-cell.is-missed').first().click()
  await expect(page.locator('.check-cell.is-missed')).toHaveCount(11)
  await expect(page.locator('.check-cell.is-done')).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('2-last-week.png') })

  // 이번 주로 돌아오면 지난주 체크는 보이지 않음
  await page.getByRole('button', { name: '이번 주로' }).click()
  await expect(weekBadge).toBeVisible()
  await expect(page.locator('.check-cell.is-done')).toHaveCount(0)

  // 과목 이름을 눌러 설정 화면으로. 학습 내용 하나를 지우고 저장하면 보드로 돌아와 사라짐
  await page.getByRole('link', { name: '수학 과목 설정' }).click()
  await expect(page.getByRole('heading', { name: '과목 수정' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('3-subject-form.png') })
  await page.getByRole('button', { name: '학습 내용 1 삭제' }).click()
  await page.getByRole('button', { name: '저장' }).click()
  await expect(board.getByRole('rowheader', { name: '문제집 2쪽' })).toHaveCount(0)
  await expect(board.getByRole('rowheader', { name: '연산 10분' })).toBeVisible()

  // 자녀별 분리: 둘째를 추가하고 고르면 과목이 비어 있고, 첫째로 돌아오면 그대로
  await addChildren(page, ['둘째'])
  const switcher = page.getByRole('group', { name: '자녀 선택' })
  await page.goto('/#/study')
  await switcher.getByRole('button', { name: '둘째' }).click()
  await expect(page.getByText('아직 과목이 없습니다.')).toBeVisible()
  await switcher.getByRole('button', { name: '첫째' }).click()
  await expect(board.getByRole('rowheader', { name: '연산 10분' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('계획표(왼쪽 과목): 과목 줄과 칸 안의 학습 내용, 체크, 보기 방식 기억, A4 가로 인쇄', async ({ page }, testInfo) => {
  const viewPicker = page.getByRole('radiogroup', { name: '보기 방식' })
  const planTable = page.locator('.plan-table')
  const summaryDone = page.locator('.week-summary strong')

  await addChildren(page, ['첫째'])
  await addSubject(page, { name: '국어', tasks: [{ name: '받아쓰기' }, { name: '독서 20분', days: ['토', '일'] }] })
  await addSubject(page, { name: '수학', color: '초록', tasks: [{ name: '연산', days: ['토', '일'] }] })
  await page.goto('/#/study')

  // 단추 순서는 [요일별, 계획표, 체크표], 기본은 요일별. 계획표로 바꾸면 과목이 줄이 되고 칸 안에 그날 학습 내용이 보임
  await expect(viewPicker.locator('.segment > span')).toHaveText(['요일별', '계획표', '체크표'])
  await expect(viewPicker.getByRole('radio', { name: '요일별' })).toBeChecked()
  await viewPicker.getByRole('radio', { name: '계획표' }).click()
  await expect(planTable).toBeVisible()
  await expect(page.locator('.check-table')).toHaveCount(0)
  await expect(planTable.getByRole('link', { name: '국어 과목 설정' })).toBeVisible()
  await expect(planTable.getByRole('link', { name: '수학 과목 설정' })).toBeVisible()
  // 칸 안의 학습 내용: 받아쓰기 평일 5 + 독서 매일 7 + 연산 매일 7 = 19
  await expect(page.locator('.plan-item')).toHaveCount(19)
  await expect(page.locator('.plan-item.is-planned')).toHaveCount(19)
  // 표는 넓어도 화면(문서) 자체는 넓어지지 않음 (좁은 화면은 표 안에서 옆으로 밂)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('1-plan.png') })

  // 오늘 칸의 학습 내용을 누르면 체크되고 이름에 줄이 그어짐
  await page.getByRole('button', { name: /^연산 .* 오늘 미완료$/ }).click()
  const checked = page.getByRole('button', { name: /^연산 .* 오늘 완료$/ })
  await expect(checked).toHaveAttribute('aria-pressed', 'true')
  await expect(checked).toHaveClass(/is-done/)
  await expect(summaryDone).toHaveText('1')

  // 인쇄: 인쇄 매체에서는 화면 대신 인쇄용 표(제목, 자녀, 과목, 학습 내용)가 보이고 A4 가로 한 장
  await expect(page.getByRole('button', { name: '인쇄' })).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  const sheet = page.locator('.print-sheet')
  await expect(sheet).toBeVisible()
  await expect(page.locator('.shell')).toBeHidden()
  // 인쇄용 표는 화면 읽기 프로그램에서 숨겨 두어(aria-hidden) 역할(heading)로는 찾을 수 없으니 요소로 찾습니다.
  await expect(sheet.locator('h1')).toHaveText('주간 학습 계획표')
  await expect(sheet.locator('.print-head p')).toContainText('첫째')
  await expect(sheet.locator('.print-subject')).toHaveText(['국어', '수학'])
  await expect(sheet.locator('.print-item')).toHaveCount(19)
  await expect(sheet.locator('.print-box.is-done')).toHaveCount(1)
  if (testInfo.project.name === 'PC') expectSingleA4(await printedPageSizes(page, testInfo.outputPath('plan-print.pdf')), 'landscape')
  await page.emulateMedia({ media: 'screen' })
  await expect(sheet).toBeHidden()

  // 체크표로 바꾸면 인쇄용 표도 체크표 모양 (학습 내용 줄마다 네모 7개)
  await viewPicker.getByRole('radio', { name: '체크표' }).click()
  await expect(page.locator('.check-table')).toBeVisible()
  await expect(page.getByRole('button', { name: /^연산 .* 오늘 완료$/ })).toHaveAttribute('aria-pressed', 'true')
  await page.emulateMedia({ media: 'print' })
  await expect(sheet.locator('h1')).toHaveText('주간 학습 체크표')
  await expect(sheet.locator('.print-check .print-task')).toHaveText(['받아쓰기', '독서 20분', '연산'])
  if (testInfo.project.name === 'PC') expectSingleA4(await printedPageSizes(page, testInfo.outputPath('check-print.pdf')), 'landscape')
  await page.emulateMedia({ media: 'screen' })

  // 새로고침해도 마지막 보기 방식(체크표)이 유지되고 체크도 남아 있음
  await page.reload()
  await expect(viewPicker.getByRole('radio', { name: '체크표' })).toBeChecked()
  await expect(page.getByRole('button', { name: /^연산 .* 오늘 완료$/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('요일별(기본): 왼쪽 요일, 위 과목, 과목 4개까지 한 화면, 체크, 보기 방식 유지, A4 세로 인쇄', async ({ page }, testInfo) => {
  const nav = page.getByRole('navigation', { name: '주 메뉴' })
  const viewPicker = page.getByRole('radiogroup', { name: '보기 방식' })
  const table = page.locator('.dayplan-table')
  const summaryDone = page.locator('.week-summary strong')

  await addChildren(page, ['첫째'])
  await addSubject(page, { name: '국어', tasks: [{ name: '받아쓰기' }, { name: '독서 20분', days: ['토', '일'] }] })
  await addSubject(page, { name: '수학', color: '초록', tasks: [{ name: '연산', days: ['토', '일'] }] })
  await addSubject(page, { name: '영어', color: '주황', tasks: [{ name: '단어 20개' }] })
  await addSubject(page, { name: '과학', color: '하늘', tasks: [{ name: '실험 노트', days: ['월', '화', '목', '금'] }] })
  await page.goto('/#/study')

  // 처음 열면 요일별: 요일이 왼쪽 7줄, 과목이 위쪽 4열
  await expect(viewPicker.getByRole('radio', { name: '요일별' })).toBeChecked()
  await expect(table).toBeVisible()
  await expect(page.locator('.plan-table, .check-table')).toHaveCount(0)
  await expect(table.getByRole('rowheader')).toHaveCount(7)
  await expect(table.locator('tbody th').first()).toContainText('월')
  await expect(table.locator('tbody th').last()).toContainText('일')
  await expect(table.locator('.dayplan-subject .subject-name')).toHaveText(['국어', '수학', '영어', '과학'])
  await expect(table.locator('tbody th.is-today')).toHaveCount(1)
  // 칸 안의 학습 내용: 받아쓰기 평일 5 + 독서 매일 7 + 연산 매일 7 + 단어 평일 5 + 실험 노트(평일 기본에서 월·화·목·금을 꺼서 수요일만) 1 = 25
  await expect(table.locator('.plan-item')).toHaveCount(25)
  // 과목 4개는 휴대폰 세로(360px)에서도 옆으로 밀지 않고 한 화면 너비에 들어감
  await expect(page.locator('.dayplan-scroll.is-scrolling')).toHaveCount(0)
  await expect(page.getByText('옆으로 밀어서')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('1-days.png'), fullPage: true })

  // 오늘 칸의 학습 내용을 누르면 체크
  await page.getByRole('button', { name: /^연산 .* 오늘 미완료$/ }).click()
  await expect(page.getByRole('button', { name: /^연산 .* 오늘 완료$/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(summaryDone).toHaveText('1')

  // 바꾼 보기 방식이 유지됨: 다른 화면에 다녀와도, 새로고침해도 요일별
  await nav.getByRole('link', { name: '홈' }).click()
  await nav.getByRole('link', { name: '학습' }).click()
  await expect(viewPicker.getByRole('radio', { name: '요일별' })).toBeChecked()
  await page.reload()
  await expect(viewPicker.getByRole('radio', { name: '요일별' })).toBeChecked()
  await expect(table).toBeVisible()
  await expect(page.getByRole('button', { name: /^연산 .* 오늘 완료$/ })).toBeVisible()

  // 인쇄: 요일별 모양 그대로 (요일 7줄, 과목 4열), 체크한 것은 채워서, A4 세로 한 장 (첫 장이 빈 종이로 나오지 않음)
  await page.emulateMedia({ media: 'print' })
  const sheet = page.locator('.print-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.locator('h1')).toHaveText('주간 학습 계획표')
  await expect(sheet.locator('.print-subject-head')).toHaveText(['국어', '수학', '영어', '과학'])
  await expect(sheet.locator('.print-byday tbody tr')).toHaveCount(7)
  await expect(sheet.locator('.print-item')).toHaveCount(25)
  await expect(sheet.locator('.print-box.is-done')).toHaveCount(1)
  if (testInfo.project.name === 'PC') expectSingleA4(await printedPageSizes(page, testInfo.outputPath('days-print.pdf')), 'portrait')
  await page.emulateMedia({ media: 'screen' })

  // 과목이 5개가 되면 휴대폰 세로에서는 표 안에서 옆으로 밀어서 봄 (화면 자체는 넓어지지 않음). 넓은 화면은 그대로 맞춤
  await addSubject(page, { name: '피아노', color: '보라', tasks: [{ name: '연습 30분' }] })
  await page.goto('/#/study')
  await expect(table.locator('.dayplan-subject')).toHaveCount(5)
  const narrow = testInfo.project.name === '폰-세로'
  await expect(page.locator('.dayplan-scroll.is-scrolling')).toHaveCount(narrow ? 1 : 0)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('2-days-many.png') })
})

test('메뉴(설정 위치), 홈의 오늘 학습, 전체 보기 카드, 빠르게 연달아 체크', async ({ page }, testInfo) => {
  const nav = page.getByRole('navigation', { name: '주 메뉴' })
  const switcher = page.getByRole('group', { name: '자녀 선택' })
  const today = page.locator('.study-today')

  await addChildren(page, ['첫째', '둘째'])

  // 세로 화면: 아래 메뉴 6개, 설정은 위쪽 톱니. 가로 화면: 왼쪽 메뉴 7개(설정 포함), 톱니 없음
  await page.goto('/')
  const portrait = testInfo.project.name === '폰-세로'
  const names = ['홈', '달력', '시간표', '학습', '납부', '보강']
  await expect(nav.getByRole('link')).toHaveText(portrait ? names : [...names, '설정'])
  await expect(page.locator('.topbar-settings')).toBeVisible({ visible: portrait })
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('1-menu.png') })

  // 학습 계획이 없으면 홈에는 안내만
  await expect(page.getByRole('heading', { name: '오늘 학습' })).toBeVisible()
  await expect(page.getByText('학습 계획이 없습니다.')).toBeVisible()

  // 자녀마다 매일 하는 학습 내용
  await switcher.getByRole('button', { name: '첫째' }).click()
  await addSubject(page, { name: '수학', tasks: [{ name: '연산', days: ['토', '일'] }, { name: '문제집', days: ['토', '일'] }] })
  await switcher.getByRole('button', { name: '둘째' }).click()
  await addSubject(page, { name: '영어', color: '초록', tasks: [{ name: '단어', days: ['토', '일'] }] })

  // 홈(전체): 두 자녀의 오늘 학습이 나오고 바로 체크
  await switcher.getByRole('button', { name: '전체' }).click()
  await page.goto('/')
  await expect(today.locator('.study-today-child')).toHaveCount(2)
  await expect(today.locator('.plan-item')).toHaveCount(3)
  await today.getByRole('button', { name: /^단어 .* 오늘 미완료$/ }).click()
  await expect(today.getByRole('button', { name: /^단어 .* 오늘 완료$/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: '오늘 학습' })).toContainText('1/3')
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('2-home-today.png'), fullPage: true })

  // 같은 주 묶음에 들어가는 두 칸을 한순간에 눌러도 둘 다 저장됨 (저장 차례 지키기)
  await page.evaluate(() => {
    document.querySelectorAll<HTMLButtonElement>('.study-today .plan-item:not(.is-done)').forEach((button) => button.click())
  })
  await expect(today.locator('.plan-item.is-done')).toHaveCount(3)
  await page.reload()
  await expect(today.locator('.plan-item.is-done')).toHaveCount(3)

  // 학습(전체): 자녀마다 이번 주 진행 카드. 누르면 그 자녀의 보드
  await nav.getByRole('link', { name: '학습' }).click()
  const cards = page.locator('.study-child-card')
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toContainText('첫째')
  await expect(cards.first()).toContainText('이번 주 2 / 14 완료')
  await expect(cards.last()).toContainText('이번 주 1 / 7 완료')
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('3-overview.png') })
  await cards.last().click()
  await expect(switcher.getByRole('button', { name: '둘째' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /^단어 .* 오늘 완료$/ })).toBeVisible()

  // 자녀를 지우면 학습 기록도 함께 지워짐 (첫째 삭제 → 홈 오늘 학습에는 둘째 것만)
  await page.goto('/#/settings/children')
  await page.getByRole('link', { name: '첫째' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '자녀 삭제' }).click()
  await page.goto('/')
  await expect(today.locator('.plan-item')).toHaveCount(1)
  await expect(today).toContainText('단어')
})

test('체크표 인쇄: 학습 내용을 안 적은 과목도 요일 칸이 나뉘고 체크 칸이 찍힘', async ({ page }, testInfo) => {
  const viewPicker = page.getByRole('radiogroup', { name: '보기 방식' })

  await addChildren(page, ['첫째'])
  await addSubject(page, { name: '국어', tasks: [{ name: '받아쓰기' }] })
  // 과목만 만들고 학습 내용은 비워 둔 과목
  await addSubject(page, { name: '미술', color: '주황', tasks: [] })
  await page.goto('/#/study')
  await viewPicker.getByRole('radio', { name: '체크표' }).click()
  await expect(page.locator('.check-table')).toBeVisible()

  await page.emulateMedia({ media: 'print' })
  const sheet = page.locator('.print-sheet')
  await expect(sheet.locator('h1')).toHaveText('주간 학습 체크표')
  // 학습 내용이 있는 과목 줄: 평일 5칸은 네모, 계획 없는 토·일 2칸은 점
  const taskRow = sheet.locator('.print-check tr', { has: page.locator('.print-task') })
  await expect(taskRow.locator('.print-box')).toHaveCount(5)
  await expect(taskRow.locator('.print-dot')).toHaveCount(2)
  // 학습 내용이 없는 과목 줄: 요일 7칸으로 나뉘고, 과목에서 고른 요일(기본 평일)에 네모가 찍힘
  const emptyRow = sheet.locator('.print-band', { hasText: '미술' })
  await expect(emptyRow.locator('td')).toHaveCount(7)
  await expect(emptyRow.locator('.print-box')).toHaveCount(5)
  await expect(emptyRow.locator('.print-dot')).toHaveCount(2)
  await page.screenshot({ path: testInfo.outputPath('check-print-empty-subject.png') })
  await page.emulateMedia({ media: 'screen' })
})

test('학습 내용 없이 과목만 요일 체크, 학습 내용이 생기면 과목 요일은 꺼짐', async ({ page }, testInfo) => {
  const viewPicker = page.getByRole('radiogroup', { name: '보기 방식' })
  const summaryDone = page.locator('.week-summary strong')

  await addChildren(page, ['첫째'])
  // 학습 내용 없이 과목만: 기본 평일에서 토·일을 켜 매일로
  await addSubject(page, { name: '독서', subjectDays: ['토', '일'], tasks: [] })
  await page.goto('/#/study')

  // 요일별(기본): 과목 칸 안에 과목 이름이 칩으로 나오고 눌러서 체크
  await expect(page.locator('.dayplan-table')).toBeVisible()
  await expect(page.locator('.plan-item')).toHaveCount(7)
  await page.getByRole('button', { name: /^독서 .* 오늘 미완료$/ }).click()
  await expect(page.getByRole('button', { name: /^독서 .* 오늘 완료$/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(summaryDone).toHaveText('1')
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('1-subject-only-days.png'), fullPage: true })

  // 체크표: 과목 줄에 바로 체크 칸 7개 ("학습 내용이 없습니다" 안내 대신)
  await viewPicker.getByRole('radio', { name: '체크표' }).click()
  const subjectRow = page.locator('.subject-row.is-checkable')
  await expect(subjectRow).toHaveCount(1)
  await expect(subjectRow.locator('.check-cell')).toHaveCount(7)
  await expect(subjectRow.locator('.check-cell.is-planned')).toHaveCount(7)
  await expect(page.getByText('학습 내용이 없습니다')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('2-subject-only-check.png') })

  // 새로고침해도 체크가 남아 있음
  await page.reload()
  await expect(page.getByRole('button', { name: /^독서 .* 오늘 완료$/ })).toBeVisible()

  // 홈의 '오늘 학습'에도 과목이 그대로 나옴
  await page.goto('/')
  const today = page.locator('.study-today')
  await expect(today.locator('.plan-item')).toHaveCount(1)
  await expect(today).toContainText('독서')

  // 과목 목록: 학습 내용이 없으면 과목 요일을 보여줌
  await page.goto('/#/study/subjects')
  await expect(page.locator('.list-sub')).toContainText('과목만 체크 · 월·화·수·목·금·토·일')

  // 학습 내용을 넣으면 과목 요일 단추가 꺼지고, 보드는 학습 내용 기준으로 바뀜
  await page.getByRole('link', { name: /^독서/ }).click()
  await expect(page.getByRole('heading', { name: '과목 수정' })).toBeVisible()
  const subjectDays = page.getByRole('group', { name: '과목 요일' })
  await expect(subjectDays.getByRole('button', { name: '월', exact: true })).toBeEnabled()
  // 학습 내용이 없는 과목은 빈 줄도 없으므로 먼저 한 줄 추가합니다.
  await page.getByRole('button', { name: '학습 내용 추가' }).click()
  await page.getByLabel('학습 내용 1 이름').fill('하루 20분')
  await expect(subjectDays.getByRole('button', { name: '월', exact: true })).toBeDisabled()
  await expect(page.getByText('학습 내용이 있어서 과목 요일은 쓰지 않습니다.')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('3-subject-form.png'), fullPage: true })
  await page.getByRole('button', { name: '저장' }).click()

  // 보드: 과목 줄 체크는 사라지고 학습 내용 줄로 (평일 5칸)
  await page.goto('/#/study')
  await expect(page.locator('.subject-row.is-checkable')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^하루 20분 .*/ }).first()).toBeVisible()
  await expect(summaryDone).toHaveText('0')
})
