import { useRef, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Segmented from '../../components/Segmented'
import {
  backupFileName,
  COLLECTION_LABELS,
  createBackup,
  parseBackup,
  restoreChanges,
  serializeBackup,
  type BackupFile,
  type BackupSummary,
  type RestoreMode,
} from '../../data/backup'
import { getFamilyState } from '../../data/cloud/family'
import { useData } from '../../data/DataProvider'
import { collectionNames } from '../../data/storage'
import { exportTextFile } from '../../native/files'
import { isNativeApp } from '../../native/notifications'
import { formatDate, type DateStr } from '../../utils/date'

export const LAST_BACKUP_KEY = 'academy-note:last-backup'

/** 마지막 백업 날짜 ('YYYY-MM-DD'). 없으면 null */
export function lastBackupDate(): DateStr | null {
  const value = localStorage.getItem(LAST_BACKUP_KEY)
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

/** 설정 > 백업과 복원: 모든 데이터를 파일 하나로 내보내고, 파일에서 되돌립니다. */
export default function BackupPage() {
  const { data, apply } = useData()
  const family = getFamilyState()
  const fileInput = useRef<HTMLInputElement>(null)
  const [lastBackup, setLastBackup] = useState(lastBackupDate())
  const [exportMessage, setExportMessage] = useState('')
  const [parsed, setParsed] = useState<{ backup: BackupFile; summary: BackupSummary; fileName: string } | null>(null)
  const [importError, setImportError] = useState('')
  const [mode, setMode] = useState<RestoreMode>('merge')
  const [busy, setBusy] = useState(false)
  const [importMessage, setImportMessage] = useState('')

  const total = collectionNames().reduce((sum, collection) => sum + data[collection].length, 0)

  async function exportBackup() {
    setBusy(true)
    setExportMessage('')
    try {
      const backup = createBackup(data)
      const result = await exportTextFile(backupFileName(), serializeBackup(backup), '학원노트 백업')
      const date = backup.exportedAt.slice(0, 10)
      localStorage.setItem(LAST_BACKUP_KEY, date)
      setLastBackup(date)
      setExportMessage(result === 'shared' ? '백업 파일을 보냈습니다.' : '백업 파일을 내려받았습니다. (내려받기 폴더)')
    } catch (error) {
      // 공유 창을 그냥 닫은 경우도 여기로 옵니다.
      setExportMessage(error instanceof Error && /cancel/i.test(error.message) ? '보내기를 취소했습니다.' : '백업 파일을 만들지 못했습니다. 다시 시도하세요.')
    } finally {
      setBusy(false)
    }
  }

  async function pickFile(file: File | undefined) {
    setImportMessage('')
    setImportError('')
    setParsed(null)
    if (!file) return
    const result = parseBackup(await file.text())
    if ('error' in result) {
      setImportError(result.error)
      return
    }
    setParsed({ ...result, fileName: file.name })
  }

  async function restore() {
    if (!parsed) return
    const label = mode === 'replace' ? '지금 데이터를 모두 지우고 백업으로 바꿉니다.' : '백업에만 있거나 더 최신인 기록을 넣습니다.'
    if (!window.confirm(`${label}\n${family ? '가족 공유 중이라 가족 모두의 데이터가 바뀝니다.\n' : ''}계속할까요?`)) return
    setBusy(true)
    try {
      const changes = restoreChanges(data, parsed.backup.data, mode)
      await apply(changes)
      setImportMessage(`가져왔습니다. (바뀐 기록 ${changes.length}개)`)
      setParsed(null)
      if (fileInput.current) fileInput.current.value = ''
    } catch {
      setImportError('가져오지 못했습니다. 다시 시도하세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="narrow">
      <PageHeader title="백업과 복원" subtitle="모든 기록을 파일 하나로 내보내고 되돌립니다." backTo="/settings" />

      <div className="card">
        <h2 className="card-title">내보내기</h2>
        <p>
          자녀, 학원, 출석, 보강, 납부, 알림 설정 등 기록 {total}개를 파일 하나(.json)로 만듭니다.
          {isNativeApp() ? ' 카카오톡 "나에게 보내기"나 구글 드라이브로 보내 두세요.' : ' 내려받기 폴더에 저장됩니다.'}
        </p>
        <p className="muted">마지막 백업: {lastBackup ? formatDate(lastBackup, { withYear: true }) : '아직 없음'}</p>
        <button type="button" className="btn btn-primary" onClick={exportBackup} disabled={busy || total === 0}>
          백업 파일 내보내기
        </button>
        {exportMessage && <p className="note" role="status">{exportMessage}</p>}
      </div>

      <div className="card">
        <h2 className="card-title">가져오기</h2>
        <p>전에 내보낸 백업 파일을 고르세요. 내용을 확인한 뒤 가져옵니다.</p>
        <input ref={fileInput} type="file" accept=".json,application/json" className="file-input" aria-label="백업 파일 고르기"
          onChange={(event) => pickFile(event.target.files?.[0])} />
        <button type="button" className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
          백업 파일 고르기
        </button>
        {importError && <p className="field-error" role="alert">{importError}</p>}
        {importMessage && <p className="note" role="status">{importMessage}</p>}

        {parsed && (
          <div className="restore-panel">
            <p>
              <strong>{parsed.fileName}</strong>
              {parsed.summary.exportedAt && <span className="muted"> · {formatDate(parsed.summary.exportedAt.slice(0, 10), { withYear: true })} 내보냄</span>}
            </p>
            <dl className="summary-grid">
              {collectionNames().map((collection) => (
                <div key={collection}>
                  <dt>{COLLECTION_LABELS[collection]}</dt>
                  <dd>{parsed.summary.counts[collection]}개</dd>
                </div>
              ))}
            </dl>
            <Segmented<RestoreMode>
              label="가져오는 방법"
              name="restore-mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'merge', label: '합치기' },
                { value: 'replace', label: '덮어쓰기' },
              ]}
            />
            <p className="muted">
              {mode === 'merge'
                ? '지금 데이터는 두고, 백업에만 있거나 백업이 더 최신인 기록만 넣습니다. 폰을 바꾸거나 합칠 때 안전합니다.'
                : '지금 데이터를 모두 지우고 백업 그대로 바꿉니다.'}
            </p>
            {family && <p className="field-error">가족 공유 중입니다. 가져오면 가족 모두의 데이터가 바뀝니다.</p>}
            <button type="button" className="btn btn-primary" onClick={restore} disabled={busy}>
              {mode === 'merge' ? '합쳐서 가져오기' : '덮어써서 가져오기'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
