export interface FeatureDef {
  key: string
  label: string
}

export interface FeatureGroup {
  label: string
  features: FeatureDef[]
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: 'Main',
    features: [{ key: 'dashboard', label: 'Dashboard' }],
  },
  {
    label: 'Master Data',
    features: [
      { key: 'vendors', label: 'Vendors' },
      { key: 'items', label: 'Items' },
      { key: 'users', label: 'Users' },
    ],
  },
  {
    label: 'Procurement',
    features: [
      { key: 'requirements', label: 'Requirements' },
      { key: 'purchase-orders', label: 'Purchase Orders' },
      { key: 'deliveries', label: 'Deliveries' },
      { key: 'discrepancies', label: 'Discrepancies' },
    ],
  },
  {
    label: 'Audit',
    features: [{ key: 'audit-logs', label: 'Audit Logs' }],
  },
]

export const ALL_FEATURES = FEATURE_GROUPS.flatMap((g) => g.features)

export function featureLabel(key: string): string {
  return ALL_FEATURES.find((f) => f.key === key)?.label ?? key
}
