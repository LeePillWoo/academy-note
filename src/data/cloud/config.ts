/**
 * Firebase 웹 앱 설정. 가족 공유를 켤 때만 씁니다.
 * - 빌드할 때 .env의 VITE_FIREBASE_CONFIG(JSON 한 줄)가 있으면 그것을 씁니다.
 * - 없으면 설정 > 가족 공유에서 붙여넣은 값을 이 기기에 저장해 씁니다. (Firebase 콘솔의 firebaseConfig 그대로 붙여넣어도 됨)
 * 이 값들은 비밀이 아닙니다. 접근 제한은 Firestore 보안 규칙(firestore.rules)이 맡습니다.
 */
export interface FirebaseConfig {
  apiKey: string
  authDomain?: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId: string
}

const PASTED_KEY = 'academy-note:firebase-config'

/** 콘솔에서 복사한 `const firebaseConfig = { apiKey: "...", ... };` 같은 글자도 읽어 줍니다. */
export function parseFirebaseConfig(text: string): FirebaseConfig | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  const json = text
    .slice(start, end + 1)
    .replace(/'([^'\\]*)'/g, '"$1"') // 작은따옴표 → 큰따옴표
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":') // 따옴표 없는 키
    .replace(/,(\s*[}\]])/g, '$1') // 끝의 쉼표
  try {
    const value: unknown = JSON.parse(json)
    if (typeof value !== 'object' || value === null) return null
    const record = value as Record<string, unknown>
    const text = (key: string) => (typeof record[key] === 'string' && record[key] ? (record[key] as string) : undefined)
    const apiKey = text('apiKey')
    const projectId = text('projectId')
    const appId = text('appId')
    if (!apiKey || !projectId || !appId) return null
    return {
      apiKey,
      projectId,
      appId,
      authDomain: text('authDomain') ?? `${projectId}.firebaseapp.com`,
      storageBucket: text('storageBucket'),
      messagingSenderId: text('messagingSenderId'),
    }
  } catch {
    return null
  }
}

function envConfig(): FirebaseConfig | null {
  const raw: unknown = import.meta.env.VITE_FIREBASE_CONFIG
  return typeof raw === 'string' && raw.trim() ? parseFirebaseConfig(raw) : null
}

export function getFirebaseConfig(): FirebaseConfig | null {
  return envConfig() ?? parseFirebaseConfig(localStorage.getItem(PASTED_KEY) ?? '')
}

/** 설정이 어디서 왔는지: 앱에 내장(env) / 이 기기에 붙여넣음 / 없음 */
export function firebaseConfigSource(): 'env' | 'pasted' | null {
  if (envConfig()) return 'env'
  if (parseFirebaseConfig(localStorage.getItem(PASTED_KEY) ?? '')) return 'pasted'
  return null
}

export function savePastedConfig(text: string): FirebaseConfig | null {
  const config = parseFirebaseConfig(text)
  if (config) localStorage.setItem(PASTED_KEY, JSON.stringify(config))
  return config
}

export function clearPastedConfig() {
  localStorage.removeItem(PASTED_KEY)
}
