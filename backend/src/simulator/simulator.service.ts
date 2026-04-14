import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';
import { PricesService } from '../prices/prices.service';

@Injectable()
export class SimulatorService {
  constructor(
    private devicesService: DevicesService,
    private pricesService: PricesService,
  ) {}

  async calculateCost(userId: number, deviceId: number, startHour: number, customDuracion?: number, customPotencia?: number) {
    if (startHour < 0 || startHour > 23) {
      throw new BadRequestException('La hora de inicio debe estar entre 0 y 23');
    }

    const devices = await this.devicesService.findAllByUserId(userId);
    const device = devices.find(d => d.id === deviceId);
    if (!device) throw new NotFoundException('Dispositivo no encontrado');

    const durationToUse = customDuracion !== undefined ? customDuracion : Number(device.duracion);
    const potencyToUse = customPotencia !== undefined ? customPotencia : Number(device.potencia);

    const todayPrices = await this.pricesService.getTodayPrices(); 
    if (!todayPrices || todayPrices.length === 0) throw new BadRequestException('No hay precios disponibles hoy');

    // 1. CÁLCULO DE LA SIMULACIÓN ACTUAL (Lo que el usuario ha seleccionado)
    let totalCost = 0;
    let remainingDuration = durationToUse;
    let currentHour = startHour;
    const calculationDetails: any[] = [];

    while (remainingDuration > 0 && currentHour <= 23) {
      const durationInThisHour = Math.min(1, remainingDuration); 
      const priceForThisHour = todayPrices.find(p => new Date(p.datetime).getHours() === currentHour);
      const priceValue = priceForThisHour ? Number(priceForThisHour.valueKwh) : 0;
      
      const costForThisHour = potencyToUse * durationInThisHour * priceValue;
      totalCost += costForThisHour;
      
      calculationDetails.push({
        hora: `${currentHour}:00`,
        tiempoUsado: `${durationInThisHour}h`,
        precioAplicado: `${priceValue.toFixed(4)} €/kWh`,
        costeFranja: `${costForThisHour.toFixed(4)} €`,
      });
      remainingDuration -= durationInThisHour;
      currentHour++;
    }

    // 2. ESCÁNER INTELIGENTE: BUSCAR MEJOR HORA HOY (A partir de la hora actual)
    const currentActualHour = new Date().getHours();
    let bestCostToday = Infinity;
    let bestStartHourToday = currentActualHour;
    
    const avgDayPrice = todayPrices.reduce((acc, p) => acc + Number(p.valueKwh), 0) / todayPrices.length;
    const durationInt = Math.ceil(durationToUse);

    // Escaneamos solo el futuro de hoy
    for (let h = currentActualHour; h <= 24 - durationInt; h++) {
      let tempCost = 0;
      let remDur = durationToUse;
      let cH = h;
      while (remDur > 0 && cH <= 23) {
        const dInH = Math.min(1, remDur);
        const p = todayPrices.find(x => new Date(x.datetime).getHours() === cH);
        const pVal = p ? Number(p.valueKwh) : 0;
        tempCost += potencyToUse * dInH * pVal;
        remDur -= dInH;
        cH++;
      }
      if (tempCost < bestCostToday) {
        bestCostToday = tempCost;
        bestStartHourToday = h;
      }
    }

    // Calcular franja actual (protección matemática por si la energía es 0)
    const totalEnergy = potencyToUse * durationToUse;
    const currentAvgPrice = totalEnergy > 0 ? (totalCost / totalEnergy) : 0;
    
    let franja = 'MEDIA 🟡';
    if (currentAvgPrice > avgDayPrice * 1.1) franja = 'CARA 🔴';
    else if (currentAvgPrice < avgDayPrice * 0.9) franja = 'BARATA 🟢';

    // 3. LÓGICA DE MAÑANA (Consultar si es necesario)
    let finalBestHour = bestStartHourToday;
    let finalBestCost = bestCostToday;
    let finalBestDay = 'hoy';
    let avisoManana: string | null = null; 

    // Solo pedimos los precios de mañana si hoy no es barato, o si ya no da tiempo a ponerlo hoy
    if (franja !== 'BARATA 🟢' || bestCostToday === Infinity) {
      try {
        const tomorrowPrices = await this.pricesService.getTomorrowPrices();
        if (tomorrowPrices && tomorrowPrices.length > 0) {
          let bestCostTomorrow = Infinity;
          let bestStartHourTomorrow = 0;
          
          // Escanear las 24 horas de mañana
          for (let h = 0; h <= 24 - durationInt; h++) {
            let tempCost = 0;
            let remDur = durationToUse;
            let cH = h;
            while (remDur > 0 && cH <= 23) {
              const dInH = Math.min(1, remDur);
              const p = tomorrowPrices.find(x => new Date(x.datetime).getHours() === cH);
              const pVal = p ? Number(p.valueKwh) : 0;
              tempCost += potencyToUse * dInH * pVal;
              remDur -= dInH;
              cH++;
            }
            if (tempCost < bestCostTomorrow) {
              bestCostTomorrow = tempCost;
              bestStartHourTomorrow = h;
            }
          }

          // Si la mejor hora de mañana es más barata que la de hoy, sugerimos mañana
          if (bestCostTomorrow < bestCostToday) {
            finalBestHour = bestStartHourTomorrow;
            finalBestCost = bestCostTomorrow;
            finalBestDay = 'mañana';
          }
        } else {
          // Aún no hay datos de mañana
          avisoManana = "Los precios de mañana estarán disponibles a partir de las 21:00h.";
        }
      } catch (error) {
        // Fallo en la llamada a la BD
        avisoManana = "Los precios de mañana estarán disponibles a partir de las 21:00h.";
      }
    }

    // Evitar ahorros negativos (por desajustes de decimales)
    let ahorroCalculado = totalCost - finalBestCost;
    if (ahorroCalculado < 0) ahorroCalculado = 0;

    return {
      dispositivo: device.nombre,
      potencia: `${potencyToUse} kW`,
      duracionTotal: `${durationToUse} h`,
      horaInicio: `${startHour}:00`,
      consumoTotalKwh: totalEnergy.toFixed(2),
      costeTotalEuros: totalCost.toFixed(2),
      desglose: calculationDetails,
      recomendacion: {
        franja,
        horaOptima: finalBestHour,
        diaOptimo: finalBestDay,
        costeOptimo: finalBestCost.toFixed(2),
        ahorro: ahorroCalculado.toFixed(2),
        avisoManana: avisoManana
      }
    };
  }
}