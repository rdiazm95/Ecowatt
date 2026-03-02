import { Injectable } from '@nestjs/common';
import { PricesService } from '../prices/prices.service';

export interface DashboardPricePoint {
  hour: number;
  priceKwh: number;
  priceMwh: number;
}

export interface TodayDashboard {
  current: {
    datetime: string;
    priceKwh: number;
    priceMwh: number;
  } | null;
  today: {
    prices: DashboardPricePoint[];
    min: number;
    max: number;
    avg: number;
  };
  tomorrow: {
    hasPrices: boolean;
    message: string;
  };
}

@Injectable()
export class DashboardService {
  constructor(private pricesService: PricesService) {}

  async getTodayDashboard(): Promise<TodayDashboard> {
    const todayPrices = await this.pricesService.getTodayPrices();
    const currentPrice = await this.pricesService.getCurrentPrice();

    // ✅ CONVERTIDO CORRECTAMENTE (string → number)
    const pricesToday = todayPrices.map((p) => ({
      hour: p.datetime.getHours(),
      priceKwh: Number(parseFloat(p.valueKwh as any).toFixed(4)),
      priceMwh: Number(parseFloat(p.value as any).toFixed(2)),
    }));

    const pricesKwh = pricesToday.map((p) => p.priceKwh);
    const avg = Number(
      (pricesKwh.reduce((a, b) => a + b, 0) / pricesKwh.length).toFixed(4),
    );

    // Precios de mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowPrices = await this.pricesService.getPricesByDate(tomorrow);

    return {
      current: currentPrice
        ? {
            datetime: currentPrice.datetime.toISOString(),
            priceKwh: Number(parseFloat(currentPrice.valueKwh as any).toFixed(4)),
            priceMwh: Number(parseFloat(currentPrice.value as any).toFixed(2)),
          }
        : null,
      today: {
        prices: pricesToday,
        min: Math.min(...pricesKwh),
        max: Math.max(...pricesKwh),
        avg,
      },
      tomorrow: {
        hasPrices: tomorrowPrices.length > 0,
        message: tomorrowPrices.length > 0
          ? 'Precios de mañana disponibles'
          : 'Precios de mañana se publican a las 21:00',
      },
    };
  }
}
