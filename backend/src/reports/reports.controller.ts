import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { Feature } from '../auth/decorators/feature.decorator.js';

@Controller('reports')
@Feature('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('spend')
  spend(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.reportsService.spend(from, to, groupBy);
  }
}
