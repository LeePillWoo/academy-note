import { defineConfig } from '@playwright/test'

// 화면 테스트: PC에 설치된 Edge로 휴대폰 세로·가로와 PC 크기에서 같은 시나리오를 실행합니다.
// 실행: npm run test:e2e   (브라우저를 따로 내려받지 않습니다)
const PORT = 5199

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  // 개발 서버가 처음 화면을 준비하는 시간까지 넉넉히
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'msedge',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    screenshot: 'only-on-failure',
    // 헤드리스 창이 가려지거나 뒤로 가면 Edge가 그리기 프레임을 멈춰, Playwright의 "요소가 멈춰 있는지" 확인이 끝나지 않습니다. 절전을 끕니다.
    launchOptions: {
      args: [
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-timer-throttling',
        '--disable-features=CalculateNativeWinOcclusion',
      ],
    },
  },
  projects: [
    {
      name: '폰-세로',
      use: { viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    {
      name: '폰-가로',
      use: { viewport: { width: 780, height: 360 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    {
      name: 'PC',
      use: { viewport: { width: 1366, height: 768 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
})
