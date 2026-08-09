import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  CreateDiscrepancyDto,
  DISCREPANCY_STATUSES,
} from './create-discrepancy.dto.js';

export class UpdateDiscrepancyDto extends PartialType(CreateDiscrepancyDto) {
  @IsOptional()
  @IsIn(DISCREPANCY_STATUSES)
  status?: (typeof DISCREPANCY_STATUSES)[number];

  @IsOptional()
  @IsString()
  description?: string;
}
