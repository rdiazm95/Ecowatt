import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Price } from './entities/price.entity';
import { EsiosService } from '../esios/esios.service';
import { UsersService } from '../users/users.service';
import axios from 'axios';

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);

  constructor(
    @InjectRepository(Price)
    private priceRepository: Repository<Price>,
    private esiosService: EsiosService,
    private usersService: UsersService,
  ) {}

  // ─────────────────────────────────────────
  // HELPER: convierte la hora local española
  // del string de ESIOS a un Date UTC "neutro"
  // Para que "00:00+02:00" se guarde como
  // 00:00 UTC en PostgreSQL, no como 22:00 UTC
  // ─────────────────────────────────────────
  private parseEsiosDatetime(raw: string): Date {
    // raw = "2026-04-27T00:00:00+02:00"
    // Tomamos solo la parte local sin offset: "2026-04-27T00:00:00"
    // y la tratamos como UTC con la Z para que no haya conversión
    const localPart = raw.substring(0, 19); // "2026-04-27T00:00:00"
    return new Date(localPart + 'Z');        // guardado como 00:00 UTC
  }

  // ─────────────────────────────────────────
  // HELPER: hora española actual como UTC neutro
  // El servidor corre en UTC, así que sumamos
  // el offset de España para obtener la hora
  // local española y buscarla en BD
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
    const lastDay = new Date(Date.UTC(year, month + 1, 0)); // último día del mes
    const dow = lastDay.getUTCDay();
    lastDay.setUTCDate(lastDay.getUTCDate() - dow);
    return lastDay;
  }

  // ─────────────────────────────────────────
  // CRON: precios de mañana cada día a las 21:00 UTC
  // (= 23:00 hora española, ESIOS ya los publicó)
  // ─────────────────────────────────────────
  @Cron('0 0 21 * * *')
  async fetchTomorrowPrices(): Promise<void> {
    this.logger.log('CRON: Iniciando descarga de precios para mañana...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await this.fetchAndSavePrices(tomorrow);
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

    // Si arranco tarde y no tengo los de mañana, los intento bajar
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
  // FIX: parseEsiosDatetime() en vez de new Date()
  // para evitar la conversión UTC que descuadra
  // las horas al guardar en PostgreSQL
  // ─────────────────────────────────────────
  async fetchAndSavePrices(date: Date): Promise<Price[]> {
    try {
      const data = await this.esiosService.getPVPCPrices(date);
      const values = data.indicator?.values || [];

      const prices: Price[] = [];

      for (const item of values) {
        const price = this.priceRepository.create({
          datetime: this.parseEsiosDatetime(item.datetime as string), // ← FIX
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
  // SELF-HEALING: busca en BD o descarga de ESIOS
  // ─────────────────────────────────────────
  async getPricesByDate(date: Date): Promise<Price[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let prices = await this.priceRepository.find({
      where: {
        datetime: Between(startOfDay, endOfDay),
      },
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
  // FIX: usa getNowSpainAsUtcNeutral() para que
  // la hora de búsqueda coincida con cómo se
  // guardaron los datos (hora española como UTC)
  // ─────────────────────────────────────────
  async getCurrentPrice(): Promise<Price | null> {
    const currentHour = this.getNowSpainAsUtcNeutral(); // ← FIX

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
  // FIX: usa getNowSpainAsUtcNeutral() para que
  // la hora de búsqueda coincida con los datos
  // ─────────────────────────────────────────
  @Cron('0 * * * *')
  async checkAndSendAlerts() {
    this.logger.log('🕵️‍♂️ Centinela despertando: Comprobando alertas de precio...');

    try {
      const ahora = this.getNowSpainAsUtcNeutral(); // ← FIX

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
          const pushMessage = {
            to: user.expoPushToken,
            sound: 'default',
            title: '¡Luz Barata Detectada! ⚡️',
            body: `El precio acaba de bajar a ${precioKwh.toFixed(3)} €/kWh. ¡Es el momento perfecto para encender tus electrodomésticos!`,
            data: { precioKwh: precioKwh },
          };

          await axios.post('https://exp.host/--/api/v2/push/send', pushMessage);

          alertasEnviadas++;
          this.logger.log(`✅ Alerta enviada a usuario ${user.email} (Objetivo: ${user.alertaPrecioObjetivo})`);
        }
      }

      this.logger.log(`Centinela vuelve a dormir. Se enviaron ${alertasEnviadas} notificaciones.`);
    } catch (error) {
      this.logger.error('Error durante la ejecución del Centinela de alertas', error);
    }
  }
}