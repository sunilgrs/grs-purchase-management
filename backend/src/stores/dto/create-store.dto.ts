import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @IsOptional()
  @IsString()
  location?: string;
}
