import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service.js';
import { DeliveriesController } from './deliveries.controller.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';

@Module({
  imports: [AuditLogsModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
})
export class DeliveriesModule {}
