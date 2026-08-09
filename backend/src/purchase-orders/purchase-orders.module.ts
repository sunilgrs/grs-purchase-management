import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { PurchaseOrdersController } from './purchase-orders.controller.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';

@Module({
  imports: [AuditLogsModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
