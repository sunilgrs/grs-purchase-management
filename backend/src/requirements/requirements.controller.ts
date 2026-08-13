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
import { RequirementsService } from './requirements.service.js';
import { CreateRequirementDto } from './dto/create-requirement.dto.js';
import { UpdateRequirementDto } from './dto/update-requirement.dto.js';
import {
  AssignVendorDto,
  ReviewRequirementDto,
  VerifyRequirementDto,
} from './dto/actions.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Feature } from '../auth/decorators/feature.decorator.js';

@Controller('requirements')
@Feature('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  @Roles('STORE_KEEPER', 'STORE_MANAGER', 'MANAGER', 'ADMIN')
  create(@Body() createRequirementDto: CreateRequirementDto) {
    return this.requirementsService.create(createRequirementDto);
  }

  @Get()
  findAll() {
    return this.requirementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.requirementsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRequirementDto: UpdateRequirementDto,
  ) {
    return this.requirementsService.update(id, updateRequirementDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.requirementsService.remove(id);
  }

  @Post(':id/submit')
  @Roles('STORE_KEEPER', 'STORE_MANAGER', 'MANAGER', 'ADMIN')
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.requirementsService.submit(id, user.id);
  }

  @Post(':id/store-manager-review')
  @Roles('STORE_MANAGER', 'MANAGER', 'ADMIN')
  storeManagerReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewRequirementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.requirementsService.storeManagerReview(id, dto, user.id);
  }

  @Post(':id/approve')
  @Roles('STORE_MANAGER', 'MANAGER', 'ADMIN')
  managerApprove(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignVendorDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.requirementsService.managerApprove(id, dto, user.id);
  }

  @Post(':id/reject')
  @Roles('STORE_MANAGER', 'MANAGER', 'ADMIN')
  managerReject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewRequirementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.requirementsService.managerReject(id, dto, user.id);
  }

  @Post(':id/mark-whatsapp-sent')
  @Roles('MANAGER', 'ADMIN')
  markWhatsAppSent(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.requirementsService.markWhatsAppSent(id, user.id);
  }

  @Post(':id/mark-awaiting-delivery')
  @Roles('MANAGER', 'ADMIN')
  markAwaitingDelivery(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.requirementsService.markAwaitingDelivery(id, user.id);
  }

  @Post(':id/start-verification')
  @Roles('STORE_KEEPER', 'STORE_MANAGER', 'MANAGER', 'ADMIN')
  startVerification(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.requirementsService.startVerification(id, user.id);
  }

  @Post(':id/verify')
  @Roles('STORE_KEEPER', 'STORE_MANAGER', 'MANAGER', 'ADMIN')
  verify(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerifyRequirementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.requirementsService.verify(id, dto, user.id);
  }

  @Get(':id/whatsapp-message')
  @Roles('MANAGER', 'ADMIN')
  whatsappMessage(@Param('id', ParseIntPipe) id: number) {
    return this.requirementsService.whatsappMessage(id);
  }
}
