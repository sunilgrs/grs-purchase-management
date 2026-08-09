import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import {
  CreatePurchaseOrderDto,
  PO_STATUSES,
} from './create-purchase-order.dto.js';

export class UpdatePurchaseOrderDto extends PartialType(
  CreatePurchaseOrderDto,
) {
  @IsOptional()
  @IsIn(PO_STATUSES)
  status?: (typeof PO_STATUSES)[number];

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
