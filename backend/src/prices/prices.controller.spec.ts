import { Test, TestingModule } from '@nestjs/testing';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';

describe('PricesController', () => {
  let controller: PricesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PricesController],
      providers: [{
        provide: PricesService,
        useValue: {
          getCurrentPrice: jest.fn(),
          getTodayPrices: jest.fn(),
          getPricesByDate: jest.fn(),
          checkAndSendAlerts: jest.fn(),
        },
      }],
    }).compile();

    controller = module.get<PricesController>(PricesController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });
});