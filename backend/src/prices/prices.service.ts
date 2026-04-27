import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Price } from './entities/price.entity';
import { EsiosService } from '../esios/esios.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service'; // <-- NUEVO IMPORT

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);

  constructor(
    @InjectRepository(Price)
    private priceRepository: Repository<Price>,
    private esiosService: EsiosService,
    private usersService: UsersService,
    private notificationsService: NotificationsService, // <-- LO INYECTAMOS AQUÍ
  ) {}

  // ─────────────────────────────────────────
  // HELPER: convierte la hora local española
  // del string de ESIOS a un Date UTC "neutro"
  // ─────────────────────────────────────────
  private parseEsiosDatetime(raw: string): Date {
    const localPart = raw.substring(0, 19);
    return new Date(localPart + 'Z');
  }

  // ─────────────────────────────────────────
  // HELPER: hora española actual como UTC neutro
  // ─────────────────────────────────────────
  private getNowSpainAsUtcNeutral(): Date {
    const now = new Date();
    const offsetHours = this.getSpainOffsetHours(now);
    const spainNow = new Date(now.getTime() + offsetHours * 3600 * 1000);
    spainNow.setMinutes(0, 0, 0);
    return spainNow;
  }

  // ─────────────────────────────────────────
  // HELPER: offset en horas de España (+1 o +2)
  // ─────────────────────────────────────────
  private getSpainOffsetHours(date: Date): number {
    const year = date.getUTCFullYear();
    const lastSundayMarch   = this.lastSundayOfUTC(year, 2);
    const lastSundayOctober = this.lastSundayOfUTC(year, 9);
    return date >= lastSundayMarch && date < lastSundayOctober ? 2 : 1;
  }

  private lastSundayOfUTC(year: number, month: number): Date {
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const dow = lastDay.getUTCDay();
    lastDay.setUTCDate(lastDay.getUTCDate() - dow);
    return lastDay;
  }

  // ─────────────────────────────────────────
  // CRON: precios de mañana cada día a las 21:00 UTC
  // ─────────────────────────────────────────
  @Cron('0 0 21 * * *')
  async fetchTomorrowPrices(): Promise<void> {
    this.logger.log('CRON: Iniciando descarga de precios para mañana...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await this.fetchAndSavePrices(tomorrow);
  }

  // ─────────────────────────────────────────
  // CRON: limpieza de precios > 31 días
  // Se ejecuta cada día a las 00:05 UTC
  // (01:05 hora española, sin tráfico)
  // ─────────────────────────────────────────
  @Cron('0 5 0 * * *')
  async cleanOldPrices(): Promise<void> {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 31);
    cutoff.setUTCHours(0, 0, 0, 0);

    const result = await this.priceRepository.delete({
      datetime: LessThan(cutoff),
    });

    this.logger.log(
      `🗑️ Limpieza: eliminados ${result.affected ?? 0} precios anteriores al ${cutoff.toISOString().substring(0, 10)}`,
    );
  }

  // ─────────────────────────────────────────
  // HISTÓRICO: precio medio/min/max por día
  // de los últimos 30 días (para la gráfica)
  // ─────────────────────────────────────────
  async getLast30DaysSummary(): Promise<
    { date: string; avg: number; min: number; max: number }[]
  > {
    const results: { date: string; avg: number; min: number; max: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const day = new Date();
      day.setUTCDate(day.getUTCDate() - i);
      day.setUTCHours(0, 0, 0, 0);

      const prices = await this.getPricesByDate(day);
      if (prices.length === 0) continue;

      const kwh = prices.map((p) => Number(parseFloat(p.valueKwh as any).toFixed(5)));
      const avg = Number((kwh.reduce((a, b) => a + b, 0) / kwh.length).toFixed(4));

      results.push({
        date: day.toISOString().substring(0, 10), // "2026-04-27"
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
    const today = new Date();
    const existingPrices = await this.getPricesByDate(today);

    if (existingPrices.length === 0) {
      this.logger.log('ARRANQUE: No hay precios de hoy, descargando...');
      await this.fetchAndSavePrices(today);
    }

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

  // ─────────────────────────────────────────
  // FETCH & SAVE
  // ─────────────────────────────────────────
  async fetchAndSavePrices(date: Date): Promise<Price[]> {
    try {
      const data = await this.esiosService.getPVPCPrices(date);
      const values = data.indicator?.values || [];

      const prices: Price[] = [];

      for (const item of values) {
        const price = this.priceRepository.create({
          datetime: this.parseEsiosDatetime(item.datetime as string),
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

  // ─────────────────────────────────────────
  // SELF-HEALING
  // ─────────────────────────────────────────
  async getPricesByDate(date: Date): Promise<Price[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let prices = await this.priceRepository.find({
      where: { datetime: Between(startOfDay, endOfDay) },
      order: { datetime: 'ASC' },
    });

    if (prices.length === 0) {
      this.logger.log(`No hay datos locales para ${date.toDateString()}. Descargando de ESIOS...`);
      try {
        prices = await this.fetchAndSavePrices(date);
      } catch (error) {
        this.logger.warn(`No se pudieron descargar los precios históricos para ${date.toDateString()}`);
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
    return this.getPricesByDate(new Date());
  }

  async getTomorrowPrices(): Promise<Price[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let prices = await this.getPricesByDate(tomorrow);

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

      const precioKwh = precioActual.valueKwh;
      this.logger.log(`Precio actual de la red: ${precioKwh.toFixed(5)} €/kWh`);

      const usuarios = await this.usersService.getUsersWithActiveAlerts();

      if (usuarios.length === 0) {
        this.logger.log('No hay usuarios con alertas activas para revisar.');
        return;
      }

      let alertasEnviadas = 0;

      for (const user of usuarios) {
        if (user.alertaPrecioObjetivo && precioKwh <= user.alertaPrecioObjetivo) {
          
          if (user.expoPushToken) {
            // AHORA USAMOS TU SERVICIO PROFESIONAL DE FIREBASE
            await this.notificationsService.sendPushNotification(
              user.expoPushToken,
              '¡Luz Barata Detectada! ⚡️',
              `El precio acaba de bajar a ${precioKwh.toFixed(3)} €/kWh. ¡Es el momento perfecto para encender tus electrodomésticos!`,
              { precioKwh: precioKwh.toString() }
            );
            alertasEnviadas++;
            this.logger.log(`✅ Alerta enviada a usuario ${user.email} (Objetivo: ${user.alertaPrecioObjetivo})`);
          }

        }
      }

      this.logger.log(`Centinela vuelve a dormir. Se enviaron ${alertasEnviadas} notificaciones.`);
    } catch (error) {
      this.logger.error('Error durante la ejecución del Centinela de alertas', error);
    }
  }
}