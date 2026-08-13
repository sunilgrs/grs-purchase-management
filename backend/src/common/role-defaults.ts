import { FEATURES } from '../auth/decorators/feature.decorator.js';

const STORE_KEEPER_FEATURES = [
  'dashboard',
  'requirements',
  'deliveries',
  'discrepancies',
];

const MANAGER_FEATURES = [...STORE_KEEPER_FEATURES, 'purchase-orders'];

export const ROLE_DEFAULT_FEATURES: Record<string, string[]> = {
  STORE_KEEPER: STORE_KEEPER_FEATURES,
  MANAGER: MANAGER_FEATURES,
  ADMIN: [...FEATURES],
  PURCHASER: [],
};

export function roleDefaultFeatures(
  role: string | null | undefined,
): string[] {
  return ROLE_DEFAULT_FEATURES[role ?? ''] ?? [];
}
