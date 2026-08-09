import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { USER_ROLES } from '../../auth/dto/register.dto.js';

export const USER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: (typeof USER_ROLES)[number];

  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: (typeof USER_STATUSES)[number];
}
