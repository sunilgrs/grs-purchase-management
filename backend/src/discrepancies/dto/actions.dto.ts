import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DiscrepancyReviewDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class VerifyDiscrepancyDto {
  @IsBoolean()
  approved: boolean;
}
