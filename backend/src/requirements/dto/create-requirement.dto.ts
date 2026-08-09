import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export const PRIORITIES = ['NORMAL', 'HIGH', 'URGENT'] as const;
export const REQUIREMENT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_STORE_MANAGER_APPROVAL',
  'PENDING_MANAGER_APPROVAL',
  'VENDOR_ASSIGNED',
  'WHATSAPP_SENT',
  'AWAITING_DELIVERY',
  'MATERIAL_RECEIVED',
  'VERIFICATION_PENDING',
  'COMPLETED',
  'REJECTED',
] as const;

export class RequirementItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  itemId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateRequirementDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  storeId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  requestedById: number;

  @IsDateString()
  requiredDate: string;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: (typeof PRIORITIES)[number];

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequirementItemDto)
  @IsNotEmpty()
  items: RequirementItemDto[];
}
