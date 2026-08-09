import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export const PO_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PARTIAL',
  'COMPLETED',
  'CANCELLED',
] as const;

export class PurchaseOrderItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  itemId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  orderedQty: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;
}

export class CreatePurchaseOrderDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  requirementId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  vendorId: number;

  @IsDateString()
  expectedDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  @IsNotEmpty()
  items: PurchaseOrderItemDto[];
}
