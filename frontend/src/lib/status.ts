import type { StatusColor } from '../types'

const COLORS: Record<string, StatusColor> = {
  completed: 'green',
  resolved: 'green',
  approved: 'green',
  active: 'green',
  full: 'green',
  good: 'green',
  delivered: 'green',
  verified: 'green',
  ready: 'green',

  in_progress: 'teal',
  partially_received: 'teal',
  partial: 'teal',
  material_received: 'teal',
  replacement_received: 'teal',

  pending: 'amber',
  open: 'amber',

  submitted: 'violet',
  manager_review: 'violet',

  awaiting_delivery: 'indigo',
  whatsapp_sent: 'indigo',
  vendor_notified: 'indigo',

  replacement_awaited: 'fuchsia',

  pending_manager_approval: 'orange',
  pending_store_manager_approval: 'orange',
  verification_pending: 'orange',
  warning: 'orange',
  shortage: 'orange',

  normal: 'blue',
  created: 'blue',

  high: 'rose',
  issue_raised: 'rose',

  urgent: 'red',
  rejected: 'red',
  damaged: 'red',
  failed: 'red',

  draft: 'cyan',
  vendor_assigned: 'cyan',
  low: 'cyan',

  cancelled: 'slate',
  inactive: 'slate',
  other: 'slate',
}

export function badgeColor(value: string): StatusColor {
  return COLORS[value.toLowerCase()] ?? 'slate'
}
