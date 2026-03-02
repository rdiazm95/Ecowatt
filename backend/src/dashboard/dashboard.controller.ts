import { Controller, Get } from '@nestjs/common';
import { DashboardService, TodayDashboard } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('today')
  async getTodayDashboard(): Promise<TodayDashboard> {
    return this.dashboardService.getTodayDashboard();
  }
}
