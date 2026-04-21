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

  // Ejecutar todos los días a las 21:00
  @Cron('0 0 21 * * *')
  async fetchTomorrowPrices(): Promise<void> {
    this.logger.log('CRON: Iniciando descarga de precios para mañana...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await this.fetchAndSavePrices(tomorrow);
  }

  // Ejecutar al iniciar la aplicación para obtener precios
  async onModuleInit(): Promise<void> {
    const today = new Date();
    const existingPrices = await this.getPricesByDate(today);
    
    if (existingPrices.length === 0) {
      this.logger.log('ARRANQUE: No hay precios de hoy, descargando...');
      await this.fetchAndSavePrices(today);
    }

    // Novedad: Si arranco el servidor tarde (después de las 20:30) y no tengo los de mañana, los bajo.
    const now = new Date();
    if (now.getHours() >= 20 && now.getMinutes() >= 30 || now.getHours() >= 21) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowPrices = await this.getPricesByDate(tomorrow);
      if (tomorrowPrices.length === 0) {
        this.logger.log('ARRANQUE: Es tarde y no tengo los precios de mañana. Descargando...');
        try {
          await this.fetchAndSavePrices(tomorrow);
        } catch (e) {
          this.logger.warn('ESIOS aún no ha publicado los precios de mañana.');
        }
      }
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
      if (error instanceof Error) {
        this.logger.error(`Error guardando precios: ${error.message}`);
      } else {
        this.logger.error(`Error guardando precios: ${String(error)}`);
      }
      throw error;
    }
  }

  // --- MÉTODO MODIFICADO CON EL PATRÓN SELF-HEALING ---
  async getPricesByDate(date: Date): Promise<Price[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Buscamos en la base de datos local primero
    let prices = await this.priceRepository.find({
      where: {
        datetime: Between(startOfDay, endOfDay),
      },
      order: { datetime: 'ASC' },
    });

    // 2. Si no hay datos para esta fecha en nuestra BD, los pedimos a ESIOS
    if (prices.length === 0) {
      this.logger.log(`No hay datos locales para ${date.toDateString()}. Descargando de ESIOS...`);
      try {
        // fetchAndSavePrices ya se encarga de guardar en BD y retornar el array de precios
        prices = await this.fetchAndSavePrices(date);
      } catch (error) {
        this.logger.warn(`No se pudieron descargar los precios históricos para ${date.toDateString()}`);
      }
    }

    return prices;
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

  // AÑADIDO: PATRÓN "SELF-HEALING" (Auto-rescate)
  async getTomorrowPrices(): Promise<Price[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let prices = await this.getPricesByDate(tomorrow);

    // Si alguien pide los de mañana, está vacío, y ya son pasadas las 20:30...
    const now = new Date();
    if (prices.length === 0 && (now.getHours() >= 21 || (now.getHours() === 20 && now.getMinutes() >= 30))) {
      this.logger.log('RESCATE: Petición de precios de mañana recibida. Intentando descargar al vuelo...');
      try {
        prices = await this.fetchAndSavePrices(tomorrow);
      } catch (error) {
        this.logger.warn('RESCATE: Intento fallido. ESIOS aún no los ha publicado.');
      }
    }

    return prices;
  }
}