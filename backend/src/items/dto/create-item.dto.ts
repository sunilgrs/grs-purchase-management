import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  itemCode: string;

  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  preferredVendorId?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
