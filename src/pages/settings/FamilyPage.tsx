import { useEffect, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Segmented from '../../components/Segmented'
import { clearPastedConfig, firebaseConfigSource, getFirebaseConfig, savePastedConfig } from '../../data/cloud/config'
import { formatFamilyCode, getFamilyState, normalizeFamilyCode } from '../../data/cloud/family'
import { createFamily, joinFamily, leaveFamily, type JoinStrategy } from '../../data/cloud/familyActions'
import { useData } from '../../data/DataProvider'
import { collectionNames } from '../../data/storage'
import { copyText, shareText } from '../../native/files'

/**
 * 설정 > 가족 공유: 가족 코드를 만들거나 참여해서 여러 기기가 같은 데이터를 보게 합니다.
 * 코드를 만들거나 참여하기 전에는 아무 연결도 하지 않습니다. (혼자 쓰기)
 */
export default function FamilyPage() {
  const { data } = useData()
  const family = getFamilyState()
  const [config, setConfig] = useState(() => getFirebaseConfig())
  const source = firebaseConfigSource()
  const [cloudError, setCloudError] = useState('')

  // 동기화 중 오류(권한, 연결 등)를 보여줍니다.
  useEffect(() => {
    const onError = (event: Event) => setCloudError(String((event as CustomEvent).detail ?? ''))
    window.addEventListener('academy-note:cloud-error', onError)
    return () => window.removeEventListener('academy-note:cloud-error', onError)
  }, [])

  const total = collectionNames().reduce((sum, collection) => sum + data[collection].length, 0)

  return (
    <section className="narrow">
      <PageHeader title="가족 공유" subtitle="가족 코드로 여러 폰이 같은 기록을 함께 봅니다." backTo="/settings" />

      {!family && (
        <p className="note">
          지금은 <strong>혼자 쓰기</strong>입니다. 기록은 이 폰에만 있고 인터넷으로 보내지 않습니다. 가족 코드를 만들거나 참여하면 그때부터 클라우드에
          저장되어 다른 폰과 실시간으로 맞춰집니다.
        </p>
      )}

      {!config ? (
        <ConfigCard onSaved={() => setConfig(getFirebaseConfig())} />
      ) : family ? (
        <FamilyStatusCard familyId={family.id} cloudError={cloudError} />
      ) : (
        <>
          <CreateCard total={total} />
          <JoinCard total={total} />
        </>
      )}

      {config && source === 'pasted' && !family && (
        <p className="muted">
          연결 설정은 이 기기에 붙여넣은 값을 씁니다.{' '}
          <button type="button" className="link-btn inline" onClick={() => {
            clearPastedConfig()
            setConfig(null)
          }}>
            붙여넣은 설정 지우기
          </button>
        </p>
      )}
    </section>
  )
}

/** Firebase 설정이 앱에 들어 있지 않을 때 붙여넣는 칸 (테스트용) */
function ConfigCard({ onSaved }: { onSaved(): void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  return (
    <div className="card">
      <h2 className="card-title">연결 설정이 아직 없습니다</h2>
      <p>
        가족 공유는 Firebase(구글 클라우드)에 저장합니다. Firebase 콘솔 → 프로젝트 설정 → 내 앱 → <code>firebaseConfig</code> 값을 복사해서 아래에
        붙여넣으세요. 이 값은 비밀이 아니며, 앱을 만들 때 넣어 두면 이 단계가 필요 없습니다.
      </p>
      <textarea className="input textarea" rows={6} value={text} aria-label="Firebase 설정" spellCheck={false}
        placeholder={'const firebaseConfig = {\n  apiKey: "...",\n  projectId: "...",\n  appId: "...",\n  ...\n};'}
        onChange={(event) => {
          setText(event.target.value)
          setError('')
        }} />
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-primary" onClick={() => {
        if (savePastedConfig(text)) onSaved()
        else setError('설정을 읽지 못했습니다. apiKey, projectId, appId가 들어 있는지 확인하세요.')
      }}>
        설정 저장
      </button>
    </div>
  )
}

function CreateCard({ total }: { total: number }) {
  const { data } = useData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState<string | null>(null)

  async function create() {
    if (!window.confirm(`이 폰의 기록 ${total}개를 올려서 가족 공간을 만듭니다. 계속할까요?`)) return
    setBusy(true)
    setError('')
    try {
      setCode(await createFamily(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : '가족 공간을 만들지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (code) return <CodePanel code={code} title="가족 코드를 만들었습니다" />

  return (
    <div className="card">
      <h2 className="card-title">가족 코드 만들기</h2>
      <p>내 폰의 기록을 올려 가족 공간을 만들고 코드를 받습니다. 코드를 가족에게 보내면 그 폰에서 참여할 수 있습니다.</p>
      <p className="muted">코드를 아는 사람은 누구나 보고 고칠 수 있으니 가족에게만 알려주세요.</p>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-primary" onClick={create} disabled={busy}>
        {busy ? '만드는 중…' : '가족 코드 만들기'}
      </button>
    </div>
  )
}

function JoinCard({ total }: { total: number }) {
  const { data } = useData()
  const [input, setInput] = useState('')
  const [strategy, setStrategy] = useState<JoinStrategy>(total === 0 ? 'replace' : 'merge')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState<{ code: string; merged: number } | null>(null)

  async function join() {
    const code = normalizeFamilyCode(input)
    if (!code) {
      setError('코드는 12자입니다. 받은 코드를 다시 확인하세요.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await joinFamily(code, strategy, data)
      setJoined({ code, merged: result.merged })
    } catch (err) {
      setError(err instanceof Error ? err.message : '참여하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (joined) {
    return (
      <CodePanel code={joined.code} title="가족에 참여했습니다"
        extra={strategy === 'merge' ? `내 기록 ${joined.merged}개를 가족 공간에 올렸습니다.` : '이 폰의 기록은 그대로 두고 가족 데이터를 봅니다.'} />
    )
  }

  return (
    <div className="card">
      <h2 className="card-title">가족 코드로 참여</h2>
      <div className="field">
        <label className="field-label" htmlFor="family-code">받은 코드</label>
        <input id="family-code" className="input code-input" value={input} placeholder="XXXX-XXXX-XXXX" autoComplete="off" autoCapitalize="characters"
          spellCheck={false} onChange={(event) => {
            setInput(event.target.value)
            setError('')
          }} />
      </div>
      {total > 0 && (
        <div className="field">
          <span className="field-label">이 폰에 있는 기록 {total}개는</span>
          <Segmented<JoinStrategy> label="참여 방법" name="join-strategy" value={strategy} onChange={setStrategy}
            options={[
              { value: 'merge', label: '가족 공간에 합치기' },
              { value: 'replace', label: '두고 가족 것만 보기' },
            ]} />
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-primary" onClick={join} disabled={busy || !input.trim()}>
        {busy ? '참여하는 중…' : '참여하기'}
      </button>
    </div>
  )
}

/** 코드 만들기·참여가 끝난 뒤: 코드를 보여주고 앱을 다시 불러옵니다. */
function CodePanel({ code, title, extra }: { code: string; title: string; extra?: string }) {
  return (
    <div className="card panel-success">
      <h2 className="card-title">{title}</h2>
      <CodeDisplay code={code} />
      {extra && <p>{extra}</p>}
      <p className="muted">계속을 누르면 앱을 다시 불러와 가족 공유로 바뀝니다.</p>
      <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
        계속
      </button>
    </div>
  )
}

function CodeDisplay({ code }: { code: string }) {
  const [message, setMessage] = useState('')
  const formatted = formatFamilyCode(code)
  return (
    <>
      <p className="code-display" aria-label="가족 코드">{formatted}</p>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={async () => setMessage((await copyText(formatted)) ? '복사했습니다.' : '복사가 막혀 있습니다. 코드를 직접 적어 주세요.')}>
          복사
        </button>
        <button type="button" className="btn btn-secondary" onClick={async () => {
          try {
            setMessage((await shareText('학원노트 가족 코드', `학원노트 가족 코드: ${formatted}`)) ? '' : '보내기를 지원하지 않는 환경입니다. 복사해서 보내 주세요.')
          } catch {
            setMessage('')
          }
        }}>
          보내기
        </button>
      </div>
      {message && <p className="muted" role="status">{message}</p>}
    </>
  )
}

function FamilyStatusCard({ familyId, cloudError }: { familyId: string; cloudError: string }) {
  const { data } = useData()
  const [busy, setBusy] = useState(false)

  async function leave() {
    const copy = window.confirm('가족 공유를 끄고 혼자 쓰기로 돌아갑니다.\n\n[확인] 지금 보이는 기록을 이 폰에 복사해 두고 나가기\n[취소] 그대로 두기')
    if (!copy) return
    setBusy(true)
    try {
      await leaveFamily(data, true)
      window.location.reload()
    } catch {
      setBusy(false)
      window.alert('나가지 못했습니다. 다시 시도하세요.')
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">가족 공유 중</h2>
      <p>이 코드를 넣은 폰끼리 같은 기록을 보고 고칩니다. 인터넷이 끊겨도 쓸 수 있고 연결되면 맞춰집니다.</p>
      <CodeDisplay code={familyId} />
      {cloudError && <p className="field-error" role="alert">동기화 오류: {cloudError}</p>}
      <p className="muted">코드를 아는 사람은 누구나 보고 고칠 수 있습니다. 가족에게만 알려주세요.</p>
      <button type="button" className="btn btn-danger btn-block" onClick={leave} disabled={busy}>
        가족 공유 나가기 (혼자 쓰기로)
      </button>
    </div>
  )
}
