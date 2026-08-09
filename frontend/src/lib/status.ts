import type { StatusColor } from '../types'

export function badgeColor(value: string): StatusColor {
  const v = value.toLowerCase()
  if (
    [
      'completed',
      'resolved',
      'approved',
      'active',
      'full',
      'good',
      'delivered',
      'verified',
      'ready',
    ].includes(v)
  )
    return 'green'
  if (
    [
      'in_progress',
      'partially_received',
      'partial',
      'pending',
      'open',
      'submitted',
      'awaiting_delivery',
      'replacement_awaited',
      'pending_manager_approval',
      'pending_store_manager_approval',
      'verification_pending',
      'normal',
      'high',
      'warning',
    ].includes(v)
  )
    return 'amber'
  if (['cancelled', 'rejected', 'damaged', 'inactive', 'failed'].includes(v))
    return 'red'
  if (
    [
      'draft',
      'created',
      'whatsapp_sent',
      'vendor_assigned',
      'material_received',
      'issue_raised',
      'manager_review',
      'vendor_notified',
      'replacement_received',
      'urgent',
      'other',
    ].includes(v)
  )
    return 'blue'
  return 'slate'
}
