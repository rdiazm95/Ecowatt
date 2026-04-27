import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class EsiosService {
  private readonly logger = new Logger(EsiosService.name);
  private readonly client: AxiosInstance;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('ESIOS_TOKEN');
    const baseURL = this.configService.get<string>('ESIOS_BASE_URL');

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Token token="${token}"`,
        'x-api-key': token,
        'Accept': 'application/json',
      },
    });
  }

  async getPVPCPrices(date: Date): Promise<any> {
    const startDate = this.formatDate(date);
    const endDate = this.formatDate(date);
    const tz = this.getSpainTimezoneOffset(date);

    try {
      const response = await this.client.get('/indicators/1001', {
        params: {
          start_date: `${startDate}T00:00:00${tz}`,
          end_date:   `${endDate}T23:59:59${tz}`,
        },
      });

      this.logger.log(`Datos PVPC obtenidos para ${startDate} (offset ${tz})`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error obteniendo datos ESIOS: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Devuelve el offset de España para una fecha concreta.
   * Horario de verano (CEST): último domingo de marzo → último domingo de octubre → +02:00
   * Horario de invierno (CET): resto del año → +01:00
   */
  private getSpainTimezoneOffset(date: Date): string {
    const year = date.getFullYear();

    // Último domingo de marzo a las 02:00 CET → empieza verano
    const lastSundayMarch = this.lastSundayOf(year, 2); // mes 2 = marzo (0-indexed)
    lastSundayMarch.setHours(2, 0, 0, 0);

    // Último domingo de octubre a las 03:00 CEST → termina verano
    const lastSundayOctober = this.lastSundayOf(year, 9); // mes 9 = octubre (0-indexed)
    lastSundayOctober.setHours(3, 0, 0, 0);

    const isSummer = date >= lastSundayMarch && date < lastSundayOctober;
    return isSummer ? '+02:00' : '+01:00';
  }

  /**
   * Calcula el último domingo de un mes dado (mes en formato 0-indexed).
   */
  private lastSundayOf(year: number, month: number): Date {
    // Empezamos desde el último día del mes y vamos hacia atrás hasta encontrar domingo
    const lastDay = new Date(year, month + 1, 0); // día 0 del mes siguiente = último del actual
    const dayOfWeek = lastDay.getDay(); // 0 = domingo
    lastDay.setDate(lastDay.getDate() - dayOfWeek);
    return lastDay;
  }

  private formatDate(date: Date): string {
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
}