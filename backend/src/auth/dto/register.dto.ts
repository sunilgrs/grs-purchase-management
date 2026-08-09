import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export const USER_ROLES = [
  'ADMIN',
  'STORE_KEEPER',
  'MANAGER',
  'PURCHASER',
] as const;

export class RegisterDto {
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
}
