import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatNumber } from '../lib/format'

describe('formatDate', () => {
  it('returns an em dash for null/undefined', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('returns raw value when it is not parseable', () => {
    expect(formatDate('garbage')).toBe('garbage')
  })

  it('formats a valid date containing the year', () => {
    const out = formatDate('2026-09-01T12:00:00Z')
    expect(out).toContain('2026')
    expect(out).not.toBe('—')
  })
})

describe('formatDateTime', () => {
  it('returns an em dash for null', () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it('formats a valid date-time containing the year', () => {
    const out = formatDateTime('2026-09-01T12:00:00Z')
    expect(out).toContain('2026')
  })
})

describe('formatNumber', () => {
  it('returns an em dash for null/undefined', () => {
    expect(formatNumber(null)).toBe('—')
    expect(formatNumber(undefined)).toBe('—')
  })

  it('formats a number with thousands separators and decimals', () => {
    expect(formatNumber(1234.5, 2)).toContain('1,234.50')
  })

  it('formats integers without decimals when not requested', () => {
    expect(formatNumber(42, 0)).toBe('42')
  })
})
