import { Capacitor, registerPlugin } from '@capacitor/core'

interface PrintPlugin {
  print(options: { name: string }): Promise<void>
}

// APK 쪽 구현: android/app/src/main/java/.../PrintPlugin.java (안드로이드 인쇄 서비스 호출)
const Print = registerPlugin<PrintPlugin>('Print')

/**
 * 지금 화면을 인쇄합니다. 인쇄 모양은 index.css의 @media print 가 정합니다.
 * - 브라우저: 인쇄 창이 열리고 네트워크 프린터나 'PDF로 저장'을 고릅니다. 파일은 앱이 만들지 않습니다.
 * - APK: 안드로이드 웹뷰는 window.print()가 동작하지 않아서 인쇄 플러그인으로 안드로이드 인쇄 서비스를 엽니다.
 */
export async function printPage(name: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      await Print.print({ name })
      return
    } catch {
      // 플러그인이 없는 환경이면 아래로 내려가 브라우저 방식으로 시도합니다.
    }
  }
  window.print()
}
