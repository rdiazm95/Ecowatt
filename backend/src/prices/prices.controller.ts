import { Controller, Get, Param, Query } from '@nestjs/common';
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

  @Get('health')
  getHealth() {
    return {
      success: true,
      message: 'Api de precios funcionando correctamente',
      timestamp: new Date(),
    };
  }
  // ─────────────────────────────────────────
  // Precios por fecha como path param
  // Usado por EstadisticasScreen para cargar tramos caros de días anteriores
  // Ejemplo: GET /prices/date/2026-04-28
  // ─────────────────────────────────────────
  @Get('date/:fecha')
  async getPricesByDateParam(@Param('fecha') fecha: string) {
    const date = new Date(fecha + 'T00:00:00Z');
    const prices = await this.pricesService.getPricesByDate(date);
    return {
      success: true,
      data: prices,
      date: fecha,
      count: prices.length,
    };
  }

  // ─────────────────────────────────────────
  // SOLO DESARROLLO: dispara el centinela manualmente
  // Eliminar o proteger con guard antes de producción
  // ─────────────────────────────────────────
  @Get('test-alert')
  async testAlert() {
    await this.pricesService.checkAndSendAlerts();
    return {
      success: true,
      message: 'Centinela ejecutado manualmente. Revisa los logs del servidor.',
      timestamp: new Date(),
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