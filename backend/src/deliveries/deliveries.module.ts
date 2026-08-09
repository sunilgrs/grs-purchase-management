import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service.js';
import { DeliveriesController } from './deliveries.controller.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { DiscrepanciesModule } from '../discrepancies/discrepancies.module.js';

@Module({
  imports: [AuditLogsModule, DiscrepanciesModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
})
export class DeliveriesModule {}
