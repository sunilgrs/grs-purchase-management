import { PartialType } from '@nestjs/mapped-types';
import { CreateRequirementDto } from './create-requirement.dto.js';

export class UpdateRequirementDto extends PartialType(CreateRequirementDto) {}
