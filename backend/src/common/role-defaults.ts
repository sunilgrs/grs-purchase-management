import { FEATURES } from '../auth/decorators/feature.decorator.js';

const STORE_KEEPER_FEATURES = [
  'dashboard',
  'requirements',
  'deliveries',
  'discrepancies',
];

const ALL_FEATURES = [...FEATURES];

export const ROLE_DEFAULT_FEATURES: Record<string, string[]> = {
  STORE_KEEPER: STORE_KEEPER_FEATURES,
  STORE_MANAGER: [...STORE_KEEPER_FEATURES],
  MANAGER: ALL_FEATURES,
  ADMIN: ALL_FEATURES,
};

export function roleDefaultFeatures(role: string | null | undefined): string[] {
  return ROLE_DEFAULT_FEATURES[role ?? ''] ?? [];
}
