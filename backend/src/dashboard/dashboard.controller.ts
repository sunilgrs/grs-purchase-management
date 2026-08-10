import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { Feature } from '../auth/decorators/feature.decorator.js';

@Controller('dashboard')
@Feature('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary() {
    return this.dashboardService.summary();
  }

  @Get('analytics')
  analytics() {
    return this.dashboardService.analytics();
  }
}
