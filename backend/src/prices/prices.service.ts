import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Price } from './entities/price.entity';
import { EsiosService } from '../esios/esios.service';

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);

  constructor(
    @InjectRepository(Price)
    private priceRepository: Repository<Price>,
    private esiosService: EsiosService,
  ) {}

  // Ejecutar todos los días a las 21:00 (los precios se publican ~20:00 - 20:30)
  @Cron('0 0 21 * * *')
  async fetchTomorrowPrices(): Promise<void> {
    this.logger.log('Iniciando descarga de precios para mañana...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await this.fetchAndSavePrices(tomorrow);
  }

  // Ejecutar al iniciar la aplicación para obtener precios de hoy
  async onModuleInit(): Promise<void> {
    const today = new Date();
    const existingPrices = await this.getPricesByDate(today);
    
    if (existingPrices.length === 0) {
      this.logger.log('No hay precios de hoy, descargando...');
      await this.fetchAndSavePrices(today);
    }
  }

  async fetchAndSavePrices(date: Date): Promise<Price[]> {
    try {
      const data = await this.esiosService.getPVPCPrices(date);
      const values = data.indicator?.values || [];

      const prices: Price[] = [];

      for (const item of values) {
        const price = this.priceRepository.create({
          datetime: new Date(item.datetime),
          value: item.value,
          valueKwh: item.value / 1000,
          geoZone: 'peninsula',
          indicatorId: 1001,
        });

        // Evitar duplicados
        const existing = await this.priceRepository.findOne({
          where: { datetime: price.datetime },
        });

        if (!existing) {
          prices.push(await this.priceRepository.save(price));
        }
      }

      this.logger.log(`Guardados ${prices.length} precios para ${date.toDateString()}`);
      return prices;
    } catch (error) {
      this.logger.error(`Error guardando precios: ${error.message}`);
      throw error;
    }
  }

  async getPricesByDate(date: Date): Promise<Price[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.priceRepository.find({
      where: {
        datetime: Between(startOfDay, endOfDay),
      },
      order: { datetime: 'ASC' },
    });
  }

  async getCurrentPrice(): Promise<Price | null> {
    const now = new Date();
    const currentHour = new Date(now);
    currentHour.setMinutes(0, 0, 0);

    return this.priceRepository.findOne({
      where: { datetime: currentHour },
    });
  }

  async getTodayPrices(): Promise<Price[]> {
    return this.getPricesByDate(new Date());
  }
}
