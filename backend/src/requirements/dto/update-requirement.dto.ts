import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import {
  CreateRequirementDto,
  REQUIREMENT_STATUSES,
} from './create-requirement.dto.js';

export class UpdateRequirementDto extends PartialType(CreateRequirementDto) {
  @IsOptional()
  @IsIn(REQUIREMENT_STATUSES)
  status?: (typeof REQUIREMENT_STATUSES)[number];

  @IsOptional()
  approvedById?: number;
}
