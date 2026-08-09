import { Module } from '@nestjs/common';
import { RequirementsService } from './requirements.service.js';
import { RequirementsController } from './requirements.controller.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module.js';

@Module({
  imports: [AuditLogsModule, PurchaseOrdersModule],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
