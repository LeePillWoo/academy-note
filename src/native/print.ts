import { Capacitor, registerPlugin } from '@capacitor/core'

interface PrintOptions {
  /** A4 가로로 인쇄 (학습 계획표·체크표). 기본은 A4 세로 */
  landscape?: boolean
}

interface PrintPlugin {
  print(options: { name: string } & PrintOptions): Promise<void>
}

// APK 쪽 구현: android/app/src/main/java/.../PrintPlugin.java (안드로이드 인쇄 서비스 호출)
const Print = registerPlugin<PrintPlugin>('Print')

/**
 * 지금 화면을 인쇄합니다. 인쇄 모양은 index.css의 @media print 가 정합니다.
 * - 브라우저: 인쇄 창이 열리고 네트워크 프린터나 'PDF로 저장'을 고릅니다. 파일은 앱이 만들지 않습니다.
 *   용지 방향은 CSS의 이름 있는 용지(@page)가 정합니다.
 * - APK: 안드로이드 웹뷰는 window.print()가 동작하지 않아서 인쇄 플러그인으로 안드로이드 인쇄 서비스를 엽니다.
 *   웹뷰 인쇄는 처음 용지를 플러그인이 정하므로 방향(landscape)을 함께 넘깁니다.
 *
 * name은 인쇄 작업 이름입니다. 'PDF로 저장'을 고르면 파일 이름의 기본값이 됩니다.
 */
export async function printPage(name: string, options: PrintOptions = {}) {
  if (Capacitor.isNativePlatform()) {
    try {
      await Print.print({ name, landscape: options.landscape ?? false })
      return
    } catch {
      // 플러그인이 없는 환경이면 아래로 내려가 브라우저 방식으로 시도합니다.
    }
  }
  const originalTitle = document.title
  document.title = name
  try {
    window.print()
  } finally {
    document.title = originalTitle
  }
}
