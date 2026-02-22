import { Controller, Get, Query } from '@nestjs/common';
import { PricesService } from './prices.service';

@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get('current')
  async getCurrentPrice() {
    const price = await this.pricesService.getCurrentPrice();
    return {
      success: true,
      data: price,
      timestamp: new Date(),
    };
  }

  @Get('today')
  async getTodayPrices() {
    const prices = await this.pricesService.getTodayPrices();
    return {
      success: true,
      data: prices,
      count: prices.length,
    };
  }

  @Get()
  async getPricesByDate(@Query('date') dateString: string) {
    const date = dateString ? new Date(dateString) : new Date();
    const prices = await this.pricesService.getPricesByDate(date);
    return {
      success: true,
      data: prices,
      date: date.toISOString().split('T')[0],
      count: prices.length,
    };
  }
}
