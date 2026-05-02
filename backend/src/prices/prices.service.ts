import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Price } from './entities/price.entity';
import { EsiosService } from '../esios/esios.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private readonly SPAIN_TZ = 'Europe/Madrid';

  constructor(
    @InjectRepository(Price)
    private priceRepository: Repository<Price>,
    private esiosService: EsiosService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  private parseEsiosDatetime(raw: string): Date {
    const localPart = raw.substring(0, 19);
    return new Date(localPart + 'Z');
  }

  // ─────────────────────────────────────────
  // HELPERS ROBUSTOS DE FECHA EN HORA ESPAÑOLA
  // ─────────────────────────────────────────
  private getSpainDateParts(date: Date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: this.SPAIN_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const pick = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? 0);

    return {
      year: pick('year'),
      month: pick('month'),
      day: pick('day'),
      hour: pick('hour'),
      minute: pick('minute'),
      second: pick('second'),
    };
  }

  private buildUtcNeutralDate(
    year: number,
    month: number,
    day: number,
    hour = 0,
    minute = 0,
    second = 0,
    ms = 0,
  ): Date {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
  }

  private getNowSpainAsUtcNeutral(): Date {
    const { year, month, day, hour } = this.getSpainDateParts();
    return this.buildUtcNeutralDate(year, month, day, hour, 0, 0, 0);
  }

  private getTodaySpainAsUtcNeutral(): Date {
    const { year, month, day } = this.getSpainDateParts();
    return this.buildUtcNeutralDate(year, month, day, 0, 0, 0, 0);
  }

  private getTomorrowSpainAsUtcNeutral(): Date {
    const tomorrow = new Date(this.getTodaySpainAsUtcNeutral());
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow;
  }

  private isTomorrowPublicationWindowOpen(date: Date = new Date()): boolean {
    const { hour, minute } = this.getSpainDateParts(date);
    return hour > 20 || (hour === 20 && minute >= 30);
  }

  // ─────────────────────────────────────────
  // CRON: precios de mañana a las 21:00 HORA ESPAÑOLA
  // ─────────────────────────────────────────
  @Cron('0 0 21 * * *', {
    name: 'fetchTomorrowPrices',
    timeZone: 'Europe/Madrid',
    waitForCompletion: true,
  })
  async fetchTomorrowPrices(): Promise<void> {
    this.logger.log('CRON: Iniciando descarga de precios y CO2 para mañana...');
    const tomorrow = this.getTomorrowSpainAsUtcNeutral();
    await this.fetchAndSavePrices(tomorrow);
  }

  // ─────────────────────────────────────────
  // CRON: limpieza a las 00:01 HORA ESPAÑOLA
  // Conserva 30 días contando el día actual
  // ─────────────────────────────────────────
  @Cron('0 1 0 * * *', {
    name: 'cleanOldPrices',
    timeZone: 'Europe/Madrid',
    waitForCompletion: true,
  })
  async cleanOldPrices(): Promise<void> {
    const cutoff = new Date(this.getTodaySpainAsUtcNeutral());
    cutoff.setUTCDate(cutoff.getUTCDate() - 29);

    const result = await this.priceRepository.delete({
      datetime: LessThan(cutoff),
    });

    this.logger.log(
      `🗑️ Limpieza: eliminados ${result.affected ?? 0} precios anteriores al ${cutoff.toISOString().substring(0, 10)}`,
    );
  }

  // ─────────────────────────────────────────
  // HISTÓRICO 30 DÍAS EN HORA ESPAÑOLA
  // ─────────────────────────────────────────
  async getLast30DaysSummary(): Promise<
    { date: string; avg: number; min: number; max: number }[]
  > {
    const results: { date: string; avg: number; min: number; max: number }[] = [];
    const todaySpain = this.getTodaySpainAsUtcNeutral();

    for (let i = 29; i >= 0; i--) {
      const day = new Date(todaySpain);
      day.setUTCDate(todaySpain.getUTCDate() - i);
      day.setUTCHours(0, 0, 0, 0);

      const prices = await this.getPricesByDate(day);
      if (prices.length === 0) continue;

      const kwh = prices.map((p) => Number(parseFloat(p.valueKwh as any).toFixed(5)));
      const avg = Number((kwh.reduce((a, b) => a + b, 0) / kwh.length).toFixed(4));

      results.push({
        date: day.toISOString().substring(0, 10),
        avg,
        min: Number(Math.min(...kwh).toFixed(4)),
        max: Number(Math.max(...kwh).toFixed(4)),
      });
    }

    return results;
  }
  // ─────────────────────────────────────────
  // ARRANQUE
  // ─────────────────────────────────────────
  async onModuleInit(): Promise<void> {
    const today = this.getTodaySpainAsUtcNeutral();
    const existingPrices = await this.getPricesByDate(today);

    if (existingPrices.length === 0) {
      this.logger.log('ARRANQUE: No hay precios de hoy, descargando...');
      await this.fetchAndSavePrices(today);
    }

    if (this.isTomorrowPublicationWindowOpen()) {
      const tomorrow = this.getTomorrowSpainAsUtcNeutral();
      const tomorrowPrices = await this.getPricesByDate(tomorrow);

      if (tomorrowPrices.length === 0) {
        this.logger.log('ARRANQUE: Ya debería haber precios de mañana. Intentando descargar...');
        try {
          await this.fetchAndSavePrices(tomorrow);
        } catch (e) {
          this.logger.warn('ESIOS aún no ha publicado los precios de mañana.');
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // FETCH & SAVE (ACTUALIZADO PARA HUELLA DE CARBONO)
  // ─────────────────────────────────────────
  async fetchAndSavePrices(date: Date): Promise<Price[]> {
    try {
      // 1. Peticiones en paralelo. Si la huella de carbono falla, capturamos el error 
      // para que no tumbe la obtención de los precios (que es el core de tu app).
      const [pvpcData, co2Data] = await Promise.all([
        this.esiosService.getPVPCPrices(date),
        this.esiosService.getHuellaCarbono(date).catch(e => {
          this.logger.warn(`No se pudo obtener la huella de carbono para ${date.toISOString()}: ${e.message}`);
          return null; 
        })
      ]);

      const pvpcValues = pvpcData?.indicator?.values || [];
      const co2Values = co2Data?.indicator?.values || [];

      const prices: Price[] = [];

      for (const item of pvpcValues) {
        const parsedDatetime = this.parseEsiosDatetime(item.datetime as string);
        
        // 2. Buscamos el valor de CO2 utilizando el string en crudo del datetime de ESIOS
        // Esto evita cualquier problema de desfase de tu zona horaria local.
        const co2Item = co2Values.find(c => c.datetime === item.datetime);

        const price = this.priceRepository.create({
          datetime: parsedDatetime,
          value: item.value,
          valueKwh: item.value / 1000,
          carbonFootprint: co2Item ? co2Item.value : null, // Asignamos la huella
          geoZone: 'peninsula',
          indicatorId: 1001,
        });

        const existing = await this.priceRepository.findOne({
          where: { datetime: price.datetime },
        });

        if (!existing) {
          prices.push(await this.priceRepository.save(price));
        } else {
          // Si el precio ya existía pero no tenía huella de carbono, lo actualizamos.
          // Esto es útil ahora mismo, ya que tienes precios guardados de días anteriores sin CO2.
          if (existing.carbonFootprint == null && co2Item) {
            existing.carbonFootprint = co2Item.value;
            await this.priceRepository.save(existing);
            prices.push(existing);
          }
        }
      }

      this.logger.log(`Procesados ${prices.length} precios para ${date.toISOString().substring(0, 10)}`);
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

  // ─────────────────────────────────────────
  // SELF-HEALING
  // ─────────────────────────────────────────
  async getPricesByDate(date: Date): Promise<Price[]> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    let prices = await this.priceRepository.find({
      where: { datetime: Between(startOfDay, endOfDay) },
      order: { datetime: 'ASC' },
    });

    if (prices.length === 0) {
      this.logger.log(
        `No hay datos locales para ${startOfDay.toISOString().substring(0, 10)}. Descargando de ESIOS...`,
      );
      try {
        prices = await this.fetchAndSavePrices(startOfDay);
      } catch (error) {
        this.logger.warn(
          `No se pudieron descargar los precios históricos para ${startOfDay.toISOString().substring(0, 10)}`,
        );
      }
    }

    return prices;
  }

  // ─────────────────────────────────────────
  // PRECIO ACTUAL
  // ─────────────────────────────────────────
  async getCurrentPrice(): Promise<Price | null> {
    const currentHour = this.getNowSpainAsUtcNeutral();
    return this.priceRepository.findOne({
      where: { datetime: currentHour },
    });
  }

  async getTodayPrices(): Promise<Price[]> {
    return this.getPricesByDate(this.getTodaySpainAsUtcNeutral());
  }

  async getTomorrowPrices(): Promise<Price[]> {
    const tomorrow = this.getTomorrowSpainAsUtcNeutral();
    let prices = await this.getPricesByDate(tomorrow);

    if (prices.length === 0 && this.isTomorrowPublicationWindowOpen()) {
      this.logger.log('RESCATE: Petición de precios de mañana recibida. Intentando descargar al vuelo...');
      try {
        prices = await this.fetchAndSavePrices(tomorrow);
      } catch (error) {
        this.logger.warn('RESCATE: Intento fallido. ESIOS aún no los ha publicado.');
      }
    }

    return prices;
  }

  // ─────────────────────────────────────────
  // CENTINELA: alertas cada hora en punto
  // ─────────────────────────────────────────
  @Cron('0 * * * *')
  async checkAndSendAlerts() {
    this.logger.log('🕵️‍♂️ Centinela despertando: Comprobando alertas de precio...');

    try {
      const ahora = this.getNowSpainAsUtcNeutral();

      const precioActual = await this.priceRepository.findOne({
        where: { datetime: ahora },
      });

      if (!precioActual) {
        this.logger.warn('No hay precios almacenados para esta hora.');
        return;
      }

      const precioKwh = Number(precioActual.valueKwh);
      this.logger.log(`Precio actual de la red: ${precioKwh.toFixed(5)} €/kWh`);

      const usuarios = await this.usersService.getUsersWithActiveAlerts();

      if (usuarios.length === 0) {
        this.logger.log('No hay usuarios con alertas activas para revisar.');
        return;
      }

      let alertasEnviadas = 0;

      for (const user of usuarios) {
        if (user.alertaPrecioObjetivo && precioKwh <= Number(user.alertaPrecioObjetivo)) {
          if (user.expoPushToken) {
            await this.notificationsService.sendPushNotification(
              user.expoPushToken,
              '¡Luz Barata Detectada! ⚡️',
              `El precio acaba de bajar a ${precioKwh.toFixed(3)} €/kWh. ¡Es el momento perfecto para encender tus electrodomésticos!`,
              { precioKwh: precioKwh.toString() },
            );

            alertasEnviadas++;
            this.logger.log(
              `✅ Alerta enviada a usuario ${user.email} (Objetivo: ${user.alertaPrecioObjetivo})`,
            );
          }
        }
      }

      this.logger.log(`Centinela vuelve a dormir. Se enviaron ${alertasEnviadas} notificaciones.`);
    } catch (error) {
      this.logger.error('Error durante la ejecución del Centinela de alertas', error);
    }
  }
}