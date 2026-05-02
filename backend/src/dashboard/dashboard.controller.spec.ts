import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{
        provide: DashboardService,
        useValue: {
          getTodayDashboard: jest.fn(),
          getHistoryDashboard: jest.fn(),
        },
      }],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });
});