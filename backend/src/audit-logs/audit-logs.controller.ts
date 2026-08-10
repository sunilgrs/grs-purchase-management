import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service.js';
import { Feature } from '../auth/decorators/feature.decorator.js';

@Controller('audit-logs')
@Feature('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll() {
    return this.auditLogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditLogsService.findOne(id);
  }
}
