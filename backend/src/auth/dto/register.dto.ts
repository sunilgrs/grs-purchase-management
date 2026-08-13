import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export const USER_ROLES = ['ADMIN', 'STORE_KEEPER', 'MANAGER'] as const;

export const PUBLIC_REGISTER_ROLES = ['STORE_KEEPER', 'MANAGER'] as const;

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
  @IsIn(PUBLIC_REGISTER_ROLES)
  role?: (typeof PUBLIC_REGISTER_ROLES)[number];
}
