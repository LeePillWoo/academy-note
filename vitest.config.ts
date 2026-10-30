import { defineConfig } from 'vitest/config'

// 계산 기능 테스트 (날짜, 금액 등). 실행: npm test
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
