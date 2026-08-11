import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'feature';

export const FEATURES = [
  'dashboard',
  'requirements',
  'purchase-orders',
  'deliveries',
  'discrepancies',
  'audit-logs',
  'vendors',
  'items',
  'users',
  'reports',
] as const;

export type Feature = (typeof FEATURES)[number];

export const Feature = (...features: Feature[]) =>
  SetMetadata(FEATURE_KEY, features);
