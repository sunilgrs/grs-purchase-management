import { describe, it, expect } from 'vitest'
import { badgeColor } from '../lib/status'

describe('badgeColor', () => {
  it('maps completed/verified statuses to green', () => {
    expect(badgeColor('COMPLETED')).toBe('green')
    expect(badgeColor('VERIFIED')).toBe('green')
  })

  it('maps material received to blue', () => {
    expect(badgeColor('MATERIAL_RECEIVED')).toBe('blue')
  })

  it('maps pending-ish statuses to amber', () => {
    expect(badgeColor('PENDING')).toBe('amber')
    expect(badgeColor('awaiting_delivery')).toBe('amber')
    expect(badgeColor('VERIFICATION_PENDING')).toBe('amber')
    expect(badgeColor('REPLACEMENT_AWAITED')).toBe('amber')
  })

  it('maps rejected status to red', () => {
    expect(badgeColor('REJECTED')).toBe('red')
  })

  it('maps sent/assigned/review statuses to blue', () => {
    expect(badgeColor('WHATSAPP_SENT')).toBe('blue')
    expect(badgeColor('vendor_assigned')).toBe('blue')
    expect(badgeColor('ISSUE_RAISED')).toBe('blue')
    expect(badgeColor('MANAGER_REVIEW')).toBe('blue')
  })

  it('falls back to slate for unknown statuses', () => {
    expect(badgeColor('UNKNOWN_STATUS')).toBe('slate')
  })
})
