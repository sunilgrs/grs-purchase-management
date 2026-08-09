import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CreateDeliveryDto, DELIVERY_STATUSES } from './create-delivery.dto.js';

export class UpdateDeliveryDto extends PartialType(CreateDeliveryDto) {
  @IsOptional()
  @IsIn(DELIVERY_STATUSES)
  status?: (typeof DELIVERY_STATUSES)[number];

  @IsOptional()
  @IsString()
  remarks?: string;
}
