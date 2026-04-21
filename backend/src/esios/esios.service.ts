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

    try {
      const response = await this.client.get('/indicators/1001', {
        params: {
          start_date: `${startDate}T00:00`,
          end_date: `${endDate}T23:59`,
        },
      });

      this.logger.log(`Datos PVPC obtenidos para ${startDate}`);
      return response.data;
    } catch (error) {
      // Usamos (error as Error) para acceder a .message
      this.logger.error(`Error obteniendo datos ESIOS: ${(error as Error).message}`);
      throw error;
  }
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
}
