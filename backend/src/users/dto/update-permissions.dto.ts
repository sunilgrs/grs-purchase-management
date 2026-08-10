import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { FEATURES } from '../../auth/decorators/feature.decorator.js';

export class UpdatePermissionsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(FEATURES, { each: true })
  permissions: string[] | null;
}
