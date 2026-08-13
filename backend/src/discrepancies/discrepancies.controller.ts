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
import { DiscrepanciesService } from './discrepancies.service.js';
import { CreateDiscrepancyDto } from './dto/create-discrepancy.dto.js';
import { UpdateDiscrepancyDto } from './dto/update-discrepancy.dto.js';
import {
  DiscrepancyReviewDto,
  VerifyDiscrepancyDto,
} from './dto/actions.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Feature } from '../auth/decorators/feature.decorator.js';

@Controller('discrepancies')
@Feature('discrepancies')
export class DiscrepanciesController {
  constructor(private readonly discrepanciesService: DiscrepanciesService) {}

  @Post()
  @Roles('STORE_KEEPER', 'MANAGER', 'ADMIN')
  create(@Body() createDiscrepancyDto: CreateDiscrepancyDto) {
    return this.discrepanciesService.create(createDiscrepancyDto);
  }

  @Get()
  findAll() {
    return this.discrepanciesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.discrepanciesService.findOne(id);
  }

  @Get(':id/whatsapp-message')
  @Roles('MANAGER', 'ADMIN')
  whatsappMessage(@Param('id', ParseIntPipe) id: number) {
    return this.discrepanciesService.whatsappMessage(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDiscrepancyDto: UpdateDiscrepancyDto,
  ) {
    return this.discrepanciesService.update(id, updateDiscrepancyDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.discrepanciesService.remove(id);
  }

  @Post(':id/start-review')
  @Roles('STORE_KEEPER', 'MANAGER', 'ADMIN')
  startReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discrepanciesService.startReview(id, user.id);
  }

  @Post(':id/manager-review')
  @Roles('MANAGER', 'ADMIN')
  managerReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DiscrepancyReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discrepanciesService.managerReview(id, dto, user.id);
  }

  @Post(':id/await-replacement')
  @Roles('STORE_KEEPER', 'MANAGER', 'ADMIN')
  awaitReplacement(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discrepanciesService.awaitReplacement(id, user.id);
  }

  @Post(':id/replacement-received')
  @Roles('STORE_KEEPER', 'MANAGER', 'ADMIN')
  replacementReceived(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discrepanciesService.replacementReceived(id, user.id);
  }

  @Post(':id/verify')
  @Roles('STORE_KEEPER', 'MANAGER', 'ADMIN')
  verify(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerifyDiscrepancyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discrepanciesService.verify(id, dto, user.id);
  }

  @Post(':id/complete')
  @Roles('MANAGER', 'ADMIN')
  complete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discrepanciesService.complete(id, user.id);
  }
}
