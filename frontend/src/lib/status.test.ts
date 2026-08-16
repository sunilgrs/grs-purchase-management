import { describe, it, expect } from 'vitest'
import { badgeColor } from '../lib/status'

describe('badgeColor', () => {
  it('maps completed/verified statuses to green', () => {
    expect(badgeColor('COMPLETED')).toBe('green')
    expect(badgeColor('VERIFIED')).toBe('green')
  })

  it('maps in-progress / material-received statuses to teal', () => {
    expect(badgeColor('IN_PROGRESS')).toBe('teal')
    expect(badgeColor('MATERIAL_RECEIVED')).toBe('teal')
  })

  it('maps each pending-ish status to its own color', () => {
    expect(badgeColor('PENDING')).toBe('amber')
    expect(badgeColor('awaiting_delivery')).toBe('indigo')
    expect(badgeColor('VERIFICATION_PENDING')).toBe('orange')
    expect(badgeColor('REPLACEMENT_AWAITED')).toBe('fuchsia')
  })

  it('maps rejected status to red', () => {
    expect(badgeColor('REJECTED')).toBe('red')
  })

  it('maps each sent/assigned/review status to its own color', () => {
    expect(badgeColor('WHATSAPP_SENT')).toBe('indigo')
    expect(badgeColor('vendor_assigned')).toBe('cyan')
    expect(badgeColor('ISSUE_RAISED')).toBe('rose')
    expect(badgeColor('MANAGER_REVIEW')).toBe('violet')
  })

  it('gives priorities distinct colors', () => {
    expect(badgeColor('HIGH')).toBe('rose')
    expect(badgeColor('NORMAL')).toBe('blue')
    expect(badgeColor('LOW')).toBe('cyan')
  })

  it('falls back to slate for unknown statuses', () => {
    expect(badgeColor('UNKNOWN_STATUS')).toBe('slate')
  })
})
