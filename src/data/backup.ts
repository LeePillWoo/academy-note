import { today, type DateStr } from '../utils/date'
import { allPutChanges, allRemovalChanges, collectionNames, emptyDatabase } from './storage'
import type { BaseRecord, Change, CollectionName, Database } from './types'

export const BACKUP_APP = 'academy-note'
/** 백업 파일 형식 번호. 데이터 구조가 크게 바뀌면 올립니다. */
export const BACKUP_VERSION = 1

/** 백업 파일 한 개 (.json) */
export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  data: Database
}

export interface BackupSummary {
  exportedAt: string
  counts: Record<CollectionName, number>
  total: number
}

export function createBackup(data: Database, exportedAt = new Date().toISOString()): BackupFile {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt, data }
}

export function backupFileName(date: DateStr = today()): string {
  return `academy-note-backup-${date}.json`
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 백업 파일 글자를 읽어 검사합니다. 모르는 데이터 종류는 버리고, id가 없는 기록은 건너뜁니다.
 * 밖에서 들어오는 파일이라 믿지 않고 하나하나 확인합니다.
 */
export function parseBackup(text: string): { backup: BackupFile; summary: BackupSummary } | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: '파일을 읽지 못했습니다. 학원노트 백업 파일(.json)인지 확인하세요.' }
  }
  if (!isRecord(raw) || raw.app !== BACKUP_APP || !isRecord(raw.data)) {
    return { error: '학원노트 백업 파일이 아닙니다.' }
  }
  const version = typeof raw.version === 'number' ? raw.version : 0
  if (version > BACKUP_VERSION) {
    return { error: '이 백업은 더 새로운 앱에서 만든 것입니다. 앱을 업데이트한 뒤 다시 가져오세요.' }
  }

  const data = emptyDatabase()
  const counts = {} as Record<CollectionName, number>
  let total = 0
  for (const collection of collectionNames()) {
    const list = raw.data[collection]
    const records: BaseRecord[] = []
    if (Array.isArray(list)) {
      for (const item of list) {
        if (!isRecord(item) || typeof item.id !== 'string' || !item.id) continue
        records.push({
          ...item,
          id: item.id,
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
        } as BaseRecord)
      }
    }
    ;(data[collection] as BaseRecord[]) = records
    counts[collection] = records.length
    total += records.length
  }

  const exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : ''
  return { backup: { app: BACKUP_APP, version, exportedAt, data }, summary: { exportedAt, counts, total } }
}

/** 덮어쓰기: 지금 것을 모두 지우고 백업으로 바꿈 / 합치기: 백업에만 있거나 백업이 더 최신인 기록만 넣음 */
export type RestoreMode = 'replace' | 'merge'

export function restoreChanges(current: Database, imported: Database, mode: RestoreMode): Change[] {
  if (mode === 'replace') return [...allRemovalChanges(current), ...allPutChanges(imported)]
  const changes: Change[] = []
  for (const collection of collectionNames()) {
    const existing = new Map((current[collection] as BaseRecord[]).map((record) => [record.id, record]))
    for (const record of imported[collection] as BaseRecord[]) {
      const mine = existing.get(record.id)
      if (!mine || record.updatedAt > mine.updatedAt) changes.push({ type: 'put', collection, item: record } as Change)
    }
  }
  return changes
}

export const COLLECTION_LABELS: Record<CollectionName, string> = {
  children: '자녀',
  academies: '학원',
  lessons: '출석 기록',
  makeups: '보강',
  payments: '납부',
  notificationRules: '알림 설정',
}
