import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';
import { PricesService } from '../prices/prices.service';

@Injectable()
export class SimulatorService {
  constructor(
    private devicesService: DevicesService,
    private pricesService: PricesService,
  ) {}

  async calculateCost(userId: number, deviceId: number, startHour: number) {
    if (startHour < 0 || startHour > 23) {
      throw new BadRequestException('La hora de inicio debe estar entre 0 y 23');
    }

    // 1. Obtener el dispositivo del usuario
    const devices = await this.devicesService.findAllByUserId(userId);
    const device = devices.find(d => d.id === deviceId);
    
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado o no pertenece al usuario');
    }

    // 2. Obtener los precios de hoy (Asumimos que tu PricesService tiene un método para esto. 
    // Ajusta el nombre del método si en tu PricesService se llama distinto, ej: getTodayPrices)
    // Para simplificar, asumimos que devuelve un array ordenado de 00:00 a 23:00
    const todayPrices = await this.pricesService.getTodayPrices(); 
    
    if (!todayPrices || todayPrices.length === 0) {
      throw new BadRequestException('No hay precios disponibles para hoy');
    }

    // 3. LA LÓGICA MATEMÁTICA
    let totalCost = 0;
    let remainingDuration = Number(device.duracion); // Ej: 1.5 horas
    let currentHour = startHour;                     // Ej: 14 (14:00h)
    const calculationDetails: any[] = []; // Para el desglose por hora

    // Bucle: Mientras quede tiempo de uso del electrodoméstico
    while (remainingDuration > 0) {
      // Si nos pasamos de las 23:00, para esta prueba de concepto (PoC) cortamos o asumimos el último precio
      if (currentHour > 23) break; 

      // ¿Cuánto tiempo consume en esta franja horaria? (Máximo 1 hora por ciclo de bucle)
      const durationInThisHour = Math.min(1, remainingDuration); 
      
      // Buscamos el precio de esta hora (Ajusta 'valueKwh' al nombre exacto de tu entidad Price)
      // LA VERSIÓN CORREGIDA:
      const priceForThisHour = todayPrices.find(p => new Date(p.datetime).getHours() === currentHour);
      const priceValue = priceForThisHour ? Number(priceForThisHour.valueKwh) : 0;
      
      // Coste = Potencia (kW) * Tiempo (h) * Precio (€/kWh)
      const costForThisHour = Number(device.potencia) * durationInThisHour * priceValue;
      
      totalCost += costForThisHour;
      
      calculationDetails.push({
        hora: `${currentHour}:00`,
        tiempoUsado: `${durationInThisHour}h`,
        precioAplicado: `${priceValue.toFixed(4)} €/kWh`,
        costeFranja: `${costForThisHour.toFixed(4)} €`,
      });

      remainingDuration -= durationInThisHour;
      currentHour++;
      console.log(todayPrices[0]);
    }

    // 4. Devolvemos el resultado formateado
    return {
      dispositivo: device.nombre,
      potencia: `${device.potencia} kW`,
      duracionTotal: `${device.duracion} h`,
      horaInicio: `${startHour}:00`,
      consumoTotalKwh: (Number(device.potencia) * Number(device.duracion)).toFixed(2),
      costeTotalEuros: totalCost.toFixed(2),
      desglose: calculationDetails
    };
  }
}