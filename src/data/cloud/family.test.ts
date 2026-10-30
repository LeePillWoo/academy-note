import { describe, expect, it } from 'vitest'
import { parseFirebaseConfig } from './config'
import { FAMILY_CODE_LENGTH, formatFamilyCode, generateFamilyCode, normalizeFamilyCode } from './family'

describe('가족 코드', () => {
  it('12자, 헷갈리는 글자(0 O 1 I) 없음', () => {
    const code = generateFamilyCode((length) => Uint8Array.from({ length }, (_, i) => i * 37))
    expect(code).toHaveLength(FAMILY_CODE_LENGTH)
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{12}$/)
    expect(generateFamilyCode()).toMatch(/^[A-HJ-NP-Z2-9]{12}$/)
  })

  it('보여줄 때 4자씩 끊고, 입력은 공백·하이픈·소문자를 받아줌', () => {
    expect(formatFamilyCode('K7F29QXAM3TD')).toBe('K7F2-9QXA-M3TD')
    expect(normalizeFamilyCode(' k7f2-9qxa m3td ')).toBe('K7F29QXAM3TD')
    expect(normalizeFamilyCode('K7F2-9QXA')).toBeNull() // 너무 짧음
    expect(normalizeFamilyCode('K7F29QXAM3T0')).toBeNull() // 0은 쓰지 않는 글자
  })
})

describe('Firebase 설정 읽기', () => {
  it('콘솔에서 복사한 자바스크립트 모양도 읽음', () => {
    const text = `const firebaseConfig = {
      apiKey: "AIzaSyXXXX",
      authDomain: "academy-note.firebaseapp.com",
      projectId: "academy-note",
      storageBucket: "academy-note.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abcdef",
    };`
    expect(parseFirebaseConfig(text)).toEqual({
      apiKey: 'AIzaSyXXXX',
      authDomain: 'academy-note.firebaseapp.com',
      projectId: 'academy-note',
      storageBucket: 'academy-note.appspot.com',
      messagingSenderId: '1234567890',
      appId: '1:1234567890:web:abcdef',
    })
  })

  it('JSON도 읽고, 꼭 필요한 값이 없으면 null', () => {
    expect(parseFirebaseConfig('{"apiKey":"a","projectId":"p","appId":"x"}')).toMatchObject({ apiKey: 'a', projectId: 'p', appId: 'x', authDomain: 'p.firebaseapp.com' })
    expect(parseFirebaseConfig('{"apiKey":"a"}')).toBeNull()
    expect(parseFirebaseConfig('아무 글자')).toBeNull()
  })
})
