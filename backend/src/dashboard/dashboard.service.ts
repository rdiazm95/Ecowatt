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
    prices: DashboardPricePoint[];
    min: number | null;
    max: number | null;
    avg: number | null;
    message: string;
  };
}

// ─────────────────────────────────────────
// Interfaz para el histórico de 30 días
// ─────────────────────────────────────────
export interface HistoryDayPoint {
  date: string;   // "2026-04-27"
  avg: number;    // precio medio €/kWh
  min: number;    // precio mínimo €/kWh
  max: number;    // precio máximo €/kWh
}

@Injectable()
export class DashboardService {
  constructor(private pricesService: PricesService) {}

  async getTodayDashboard(): Promise<TodayDashboard> {
    const todayPrices = await this.pricesService.getTodayPrices();
    const currentPrice = await this.pricesService.getCurrentPrice();

    const pricesToday = todayPrices.map((p) => ({
      hour: p.datetime.getHours(),
      priceKwh: Number(parseFloat(p.valueKwh as any).toFixed(4)),
      priceMwh: Number(parseFloat(p.value as any).toFixed(2)),
    }));

    const pricesKwh = pricesToday.map((p) => p.priceKwh);
    const avg = Number(
      (pricesKwh.reduce((a, b) => a + b, 0) / pricesKwh.length).toFixed(4),
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowPrices = await this.pricesService.getPricesByDate(tomorrow);

    const pricesTomorrow = tomorrowPrices.map((p) => ({
      hour: p.datetime.getHours(),
      priceKwh: Number(parseFloat(p.valueKwh as any).toFixed(4)),
      priceMwh: Number(parseFloat(p.value as any).toFixed(2)),
    }));

    const tomorrowKwh = pricesTomorrow.map((p) => p.priceKwh);

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
        prices: pricesTomorrow,
        min: tomorrowKwh.length > 0 ? Math.min(...tomorrowKwh) : null,
        max: tomorrowKwh.length > 0 ? Math.max(...tomorrowKwh) : null,
        avg:
          tomorrowKwh.length > 0
            ? Number(
                (
                  tomorrowKwh.reduce((a, b) => a + b, 0) / tomorrowKwh.length
                ).toFixed(4),
              )
            : null,
        message:
          tomorrowPrices.length > 0
            ? 'Precios de mañana disponibles'
            : 'Precios de mañana se publican a las 21:00',
      },
    };
  }

  // ─────────────────────────────────────────
  // HISTÓRICO 30 DÍAS
  // Devuelve avg/min/max por día para la gráfica
  // ─────────────────────────────────────────
  async getHistoryDashboard(): Promise<HistoryDayPoint[]> {
    return this.pricesService.getLast30DaysSummary();
  }
}