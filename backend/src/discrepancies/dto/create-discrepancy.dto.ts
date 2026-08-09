import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export const DISCREPANCY_TYPES = [
  'SHORTAGE',
  'EXCESS',
  'DAMAGE',
  'WRONG_ITEM',
  'QUALITY',
  'OTHER',
] as const;

export const DISCREPANCY_STATUSES = [
  'ISSUE_RAISED',
  'MANAGER_REVIEW',
  'VENDOR_NOTIFIED',
  'REPLACEMENT_AWAITED',
  'REPLACEMENT_RECEIVED',
  'VERIFIED',
  'COMPLETED',
  'REJECTED',
] as const;

export class CreateDiscrepancyDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  poId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  deliveryId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  itemId: number;

  @IsString()
  @IsNotEmpty()
  discrepancyType: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsIn(DISCREPANCY_STATUSES)
  status?: (typeof DISCREPANCY_STATUSES)[number];
}
