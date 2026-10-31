import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup, restoreChanges, serializeBackup } from './backup'
import { emptyDatabase } from './storage'
import type { Child, Database } from './types'

const child = (id: string, name: string, updatedAt: string): Child => ({ id, name, color: '#000', order: 0, createdAt: '2026-01-01', updatedAt })

function db(children: Child[]): Database {
  return { ...emptyDatabase(), children }
}

describe('백업 파일 읽기', () => {
  it('내보낸 파일을 그대로 읽음', () => {
    const text = serializeBackup(createBackup(db([child('a', '첫째', '2026-10-30')]), '2026-10-30T10:00:00.000Z'))
    const result = parseBackup(text)
    expect('backup' in result).toBe(true)
    if ('backup' in result) {
      expect(result.summary).toEqual({
        exportedAt: '2026-10-30T10:00:00.000Z',
        counts: { children: 1, academies: 0, lessons: 0, makeups: 0, payments: 0, notificationRules: 0, subjects: 0, studyTasks: 0, studyWeeks: 0 },
        total: 1,
      })
      expect(result.backup.data.children[0].name).toBe('첫째')
    }
  })

  it('학원노트 파일이 아니거나 깨졌으면 오류', () => {
    expect(parseBackup('{"foo":1}')).toEqual({ error: '학원노트 백업 파일이 아닙니다.' })
    expect(parseBackup('이건 json이 아님')).toMatchObject({ error: expect.stringContaining('읽지 못했습니다') })
    expect(parseBackup(JSON.stringify({ app: 'academy-note', version: 99, data: {} }))).toMatchObject({ error: expect.stringContaining('새로운 앱') })
  })

  it('모르는 종류는 버리고, id 없는 기록은 건너뜀, 날짜가 없으면 빈 글자로', () => {
    const text = JSON.stringify({
      app: 'academy-note',
      version: 1,
      data: { children: [{ id: 'a', name: '첫째' }, { name: 'id 없음' }, 'not-object'], hacker: [{ id: 'x' }] },
    })
    const result = parseBackup(text)
    if (!('backup' in result)) throw new Error(result.error)
    expect(result.backup.data.children).toEqual([{ id: 'a', name: '첫째', createdAt: '', updatedAt: '' }])
    expect('hacker' in result.backup.data).toBe(false)
    expect(result.summary.total).toBe(1)
  })
})

describe('복원', () => {
  const current = db([child('a', '첫째(내 것)', '2026-10-30'), child('b', '둘째', '2026-10-30')])
  const imported = db([child('a', '첫째(백업)', '2026-10-20'), child('c', '셋째', '2026-10-25')])

  it('덮어쓰기: 지금 것 모두 지우고 백업으로', () => {
    const changes = restoreChanges(current, imported, 'replace')
    expect(changes.map((c) => `${c.type}:${c.type === 'put' ? c.item.id : c.id}`)).toEqual(['remove:a', 'remove:b', 'put:a', 'put:c'])
  })

  it('합치기: 백업에만 있거나 더 최신인 것만, 지우지는 않음', () => {
    const changes = restoreChanges(current, imported, 'merge')
    // a는 내 것이 더 최신이라 그대로, c는 새로 추가
    expect(changes.map((c) => `${c.type}:${c.type === 'put' ? c.item.id : c.id}`)).toEqual(['put:c'])
  })
})

describe('학습 기록도 백업에 포함', () => {
  it('v1.0.0 백업(학습 없음)도 읽고, 학습 기록은 그대로 왕복', () => {
    const old = JSON.stringify({ app: 'academy-note', version: 1, exportedAt: '2026-10-30T10:00:00.000Z', data: { children: [] } })
    const oldResult = parseBackup(old)
    expect('backup' in oldResult && oldResult.backup.data.studyWeeks).toEqual([])

    const data = { ...db([child('a', '첫째', '2026-10-30')]) }
    data.subjects = [{ id: 's1', childId: 'a', name: '수학', color: '#6366f1', order: 0, createdAt: '', updatedAt: '' }]
    data.studyWeeks = [{ id: 'a:2026-10-26', childId: 'a', weekStart: '2026-10-26', done: ['t1:2026-10-27'], createdAt: '', updatedAt: '' }]
    const result = parseBackup(serializeBackup(createBackup(data)))
    expect('backup' in result && result.backup.data.studyWeeks[0].done).toEqual(['t1:2026-10-27'])
    expect('summary' in result && result.summary.counts.subjects).toBe(1)
  })
})
