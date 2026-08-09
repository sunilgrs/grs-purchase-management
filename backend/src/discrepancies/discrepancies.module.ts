import { Module } from '@nestjs/common';
import { DiscrepanciesService } from './discrepancies.service.js';
import { DiscrepanciesController } from './discrepancies.controller.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';

@Module({
  imports: [AuditLogsModule],
  controllers: [DiscrepanciesController],
  providers: [DiscrepanciesService],
})
export class DiscrepanciesModule {}
