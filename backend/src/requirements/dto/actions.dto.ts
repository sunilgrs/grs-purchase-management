import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ReviewRequirementDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class AssignVendorItemDto {
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
  unitPrice?: number;
}

export class AssignVendorDto {
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
  @Type(() => AssignVendorItemDto)
  @IsNotEmpty()
  items: AssignVendorItemDto[];
}

export class VerifyRequirementDto {
  @IsBoolean()
  approved: boolean;
}
