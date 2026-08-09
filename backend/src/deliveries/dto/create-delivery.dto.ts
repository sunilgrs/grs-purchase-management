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

export const DELIVERY_STATUSES = ['PARTIAL', 'FULL'] as const;
export const DELIVERY_CONDITIONS = [
  'GOOD',
  'DAMAGED',
  'SHORTAGE',
  'MISMATCH',
] as const;

export class DeliveryItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  itemId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  receivedQty: number;

  @IsOptional()
  @IsIn(DELIVERY_CONDITIONS)
  condition?: (typeof DELIVERY_CONDITIONS)[number];

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateDeliveryDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  poId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  receivedById: number;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsIn(DELIVERY_STATUSES)
  status?: (typeof DELIVERY_STATUSES)[number];

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryItemDto)
  @IsNotEmpty()
  items: DeliveryItemDto[];
}
