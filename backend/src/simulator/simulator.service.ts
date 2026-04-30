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
    // Ahora acepta decimales: 0.1667 = 00:10, 12.5 = 12:30
    if (startHour < 0 || startHour >= 24) {
      throw new BadRequestException('La hora de inicio debe estar entre 0 y 23.99');
    }

    const devices = await this.devicesService.findAllByUserId(userId);
    const device = devices.find(d => d.id === deviceId);
    if (!device) throw new NotFoundException('Dispositivo no encontrado');

    const durationToUse = customDuracion !== undefined ? customDuracion : Number(device.duracion);
    const potencyToUse = customPotencia !== undefined ? customPotencia : Number(device.potencia);

    const todayPrices = await this.pricesService.getTodayPrices();
    if (!todayPrices || todayPrices.length === 0) throw new BadRequestException('No hay precios disponibles hoy');

    // Helper: formatea un decimal de hora a "HH:MM"
    const formatHourLabel = (h: number): string => {
      const hh = Math.floor(h).toString().padStart(2, '0');
      const mm = Math.round((h - Math.floor(h)) * 60).toString().padStart(2, '0');
      return `${hh}:${mm}`;
    };

    // -------------------------------------------------------------------------
    // 1. CÁLCULO DE LA SIMULACIÓN ACTUAL
    //    Soporta startHour decimal: si arrancas a las 00:10 (0.1667),
    //    en la hora 0 solo quedan 0.8333h disponibles (50 minutos).
    // -------------------------------------------------------------------------
    let totalCost = 0;
    let remainingDuration = durationToUse;

    // Hora entera en la que empieza (para buscar precio)
    let currentHourInt = Math.floor(startHour);
    // Fracción de hora ya consumida al inicio (ej: 0.1667 para 00:10)
    const startFraction = startHour - currentHourInt;
    let isFirstSegment = true;

    const calculationDetails: any[] = [];

    while (remainingDuration > 0 && currentHourInt <= 23) {
      // En el primer segmento, la hora ya lleva startFraction consumido,
      // así que solo quedan (1 - startFraction) horas disponibles en esa franja.
      const availableInThisHour = isFirstSegment ? (1 - startFraction) : 1;
      const durationInThisHour = Math.min(availableInThisHour, remainingDuration);
      isFirstSegment = false;

      // Búsqueda de precio usando entero → siempre encuentra el precio correcto
      const priceForThisHour = todayPrices.find(
        p => new Date(p.datetime).getHours() === currentHourInt,
      );
      const priceValue = priceForThisHour ? Number(priceForThisHour.valueKwh) : 0;

      const costForThisHour = potencyToUse * durationInThisHour * priceValue;
      totalCost += costForThisHour;

      calculationDetails.push({
        hora: `${currentHourInt.toString().padStart(2, '0')}:00`,
        tiempoUsado: `${durationInThisHour.toFixed(2)}h`,
        precioAplicado: `${priceValue.toFixed(4)} €/kWh`,
        costeFranja: `${costForThisHour.toFixed(4)} €`,
      });

      remainingDuration -= durationInThisHour;
      currentHourInt++;
    }

    // -------------------------------------------------------------------------
    // 2. ESCÁNER INTELIGENTE: BUSCAR MEJOR HORA HOY (enteros, sin cambios)
    // -------------------------------------------------------------------------
    const currentActualHour = new Date().getHours();
    let bestCostToday = Infinity;
    let bestStartHourToday = currentActualHour;

    const avgDayPrice = todayPrices.reduce((acc, p) => acc + Number(p.valueKwh), 0) / todayPrices.length;
    const durationInt = Math.ceil(durationToUse);

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

    // Calcular franja actual
    const totalEnergy = potencyToUse * durationToUse;
    const currentAvgPrice = totalEnergy > 0 ? (totalCost / totalEnergy) : 0;

    let franja = 'MEDIA 🟡';
    if (currentAvgPrice > avgDayPrice * 1.1) franja = 'CARA 🔴';
    else if (currentAvgPrice < avgDayPrice * 0.9) franja = 'BARATA 🟢';

    // -------------------------------------------------------------------------
    // 3. LÓGICA DE MAÑANA (sin cambios)
    // -------------------------------------------------------------------------
    let finalBestHour = bestStartHourToday;
    let finalBestCost = bestCostToday;
    let finalBestDay = 'hoy';
    let avisoManana: string | null = null;

    if (franja !== 'BARATA 🟢' || bestCostToday === Infinity) {
      try {
        const tomorrowPrices = await this.pricesService.getTomorrowPrices();
        if (tomorrowPrices && tomorrowPrices.length > 0) {
          let bestCostTomorrow = Infinity;
          let bestStartHourTomorrow = 0;

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

          if (bestCostTomorrow < bestCostToday) {
            finalBestHour = bestStartHourTomorrow;
            finalBestCost = bestCostTomorrow;
            finalBestDay = 'mañana';
          }
        } else {
          avisoManana = "Los precios de mañana estarán disponibles a partir de las 21:00h.";
        }
      } catch (error) {
        avisoManana = "Los precios de mañana estarán disponibles a partir de las 21:00h.";
      }
    }

    // Evitar ahorros negativos
    let ahorroCalculado = totalCost - finalBestCost;
    if (ahorroCalculado < 0) ahorroCalculado = 0;

    return {
      dispositivo: device.nombre,
      potencia: `${potencyToUse} kW`,
      duracionTotal: `${durationToUse} h`,
      horaInicio: formatHourLabel(startHour),   // "00:10" en vez de "0.1667:00"
      consumoTotalKwh: totalEnergy.toFixed(2),
      costeTotalEuros: totalCost.toFixed(2),
      desglose: calculationDetails,
      recomendacion: {
        franja,
        horaOptima: finalBestHour,
        diaOptimo: finalBestDay,
        costeOptimo: finalBestCost.toFixed(2),
        ahorro: ahorroCalculado.toFixed(2),
        avisoManana: avisoManana,
      },
    };
  }
}