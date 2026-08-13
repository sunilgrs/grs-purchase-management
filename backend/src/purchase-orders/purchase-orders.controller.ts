import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Feature } from '../auth/decorators/feature.decorator.js';

@Controller('purchase-orders')
@Feature('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @Roles('MANAGER', 'ADMIN')
  create(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.purchaseOrdersService.create(createPurchaseOrderDto, user?.id);
  }

  @Get()
  @Feature()
  findAll() {
    return this.purchaseOrdersService.findAll();
  }

  @Get(':id')
  @Feature()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(id, updatePurchaseOrderDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrdersService.remove(id);
  }
}
