import { Capacitor } from '@capacitor/core'

/**
 * 글자 파일을 내보냅니다.
 * - APK: 앱 임시 폴더에 쓴 뒤 안드로이드 공유 창을 엽니다. (카카오톡 나에게 보내기, 드라이브 등) 저장 권한이 필요 없습니다.
 * - 브라우저: 내려받기 폴더로 저장됩니다.
 */
export async function exportTextFile(fileName: string, text: string, title: string): Promise<'shared' | 'downloaded'> {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
    const written = await Filesystem.writeFile({ path: fileName, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title, files: [written.uri] })
    return 'shared'
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}

/** 짧은 글(가족 코드 등)을 다른 앱으로 보냅니다. 보낼 방법이 없으면 false */
export async function shareText(title: string, text: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import('@capacitor/share')
    await Share.share({ title, text })
    return true
  }
  if (typeof navigator.share === 'function') {
    await navigator.share({ title, text })
    return true
  }
  return false
}

/** 글자를 복사합니다. 복사가 막힌 환경(http 주소 등)이면 false */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
