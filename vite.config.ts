import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 상대 경로로 빌드해야 GitHub Pages와 Capacitor(APK)에서 모두 열립니다.
  base: './',
})
