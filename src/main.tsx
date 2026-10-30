import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import App from './App'
import './index.css'

// HashRouter: 주소에 #을 붙여 화면을 나눕니다. 서버 설정 없이 GitHub Pages와 APK에서 그대로 동작합니다.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
