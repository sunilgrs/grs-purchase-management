import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { StoresModule } from './stores/stores.module.js';
import { VendorsModule } from './vendors/vendors.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ItemsModule } from './items/items.module.js';
import { RequirementsModule } from './requirements/requirements.module.js';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module.js';
import { DeliveriesModule } from './deliveries/deliveries.module.js';
import { DiscrepanciesModule } from './discrepancies/discrepancies.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { HealthModule } from './health/health.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { FeatureGuard } from './auth/guards/feature.guard.js';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      // Disabled under test so e2e suites are not rate-limited
      skipIf: () => process.env.NODE_ENV === 'test',
      throttlers: [{ ttl: 60000, limit: 100 }],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StoresModule,
    VendorsModule,
    CategoriesModule,
    ItemsModule,
    RequirementsModule,
    PurchaseOrdersModule,
    DeliveriesModule,
    DiscrepanciesModule,
    AuditLogsModule,
    HealthModule,
    DashboardModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: FeatureGuard },
  ],
})
export class AppModule {}
