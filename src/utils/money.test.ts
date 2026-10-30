import { describe, expect, it } from 'vitest'
import { formatWon, parseAmount } from './money'

describe('금액', () => {
  it('읽기 쉽게 보여주기', () => {
    expect(formatWon(250_000)).toBe('25만 원')
    expect(formatWon(255_000)).toBe('25만 5,000원')
    expect(formatWon(1_200_000)).toBe('120만 원')
    expect(formatWon(8_000)).toBe('8,000원')
    expect(formatWon(0)).toBe('0원')
  })

  it('입력에서 숫자만 꺼내기', () => {
    expect(parseAmount('250,000')).toBe(250_000)
    expect(parseAmount('250000원')).toBe(250_000)
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('원')).toBeNull()
  })
})
