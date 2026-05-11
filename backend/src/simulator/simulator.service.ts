import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';
import { PricesService } from '../prices/prices.service';

@Injectable()
export class SimulatorService {
  constructor(
    private devicesService: DevicesService,
    private pricesService: PricesService,
  ) {}

  async calculateCost(
    userId: number,
    deviceId: number,
    startHour: number,
    customDuracion?: number,
    customPotencia?: number,
  ) {
    if (startHour < 0 || startHour >= 24) {
      throw new BadRequestException('La hora de inicio debe estar entre 0 y 23.9999');
    }

    const devices = await this.devicesService.findAllByUserId(userId);
    const device = devices.find((d) => d.id === deviceId);
    if (!device) throw new NotFoundException('Dispositivo no encontrado');

    const durationToUse =
      customDuracion !== undefined ? customDuracion : Number(device.duracion);
    const potencyToUse =
      customPotencia !== undefined ? customPotencia : Number(device.potencia);

    if (durationToUse <= 0) {
      throw new BadRequestException('La duración debe ser mayor que 0');
    }

    // ── Cargar precios hoy ────────────────────────────────────────────────────
    const todayPrices = await this.pricesService.getTodayPrices();
    if (!todayPrices || todayPrices.length === 0) {
      throw new BadRequestException('No hay precios disponibles hoy');
    }

    // ── Cargar precios mañana (puede no estar disponible antes de las 21h) ───
    let tomorrowPrices: typeof todayPrices = [];
    try {
      const result = await this.pricesService.getTomorrowPrices();
      if (result && result.length > 0) tomorrowPrices = result;
    } catch {
      tomorrowPrices = [];
    }

    // ── Helper: formatea decimal de hora a "HH:MM" ───────────────────────────
    const formatHourLabel = (h: number): string => {
      // Normalizar por si h >= 24 (cruce de medianoche)
      const normalized = h >= 24 ? h - 24 : h;
      const hh = Math.floor(normalized).toString().padStart(2, '0');
      const mm = Math.round((normalized - Math.floor(normalized)) * 60)
        .toString()
        .padStart(2, '0');
      return `${hh}:${mm}`;
    };

    // ── Helper: obtiene el precio €/kWh para una hora entera ─────────────────
    // useToday=true → todayPrices, false → tomorrowPrices
    const getPriceForHourInt = (hourInt: number, useToday: boolean): number => {
      const list = useToday ? todayPrices : tomorrowPrices;
      const entry = list.find(
        (p) => new Date(p.datetime).getHours() === hourInt,
      );
      return entry ? Number(entry.valueKwh) : 0;
    };

    // ── Detectar si la programación cruza medianoche ─────────────────────────
    // Ejemplo: inicio 23:00 + 2h duración → endHourDecimal = 25 → cruza medianoche
    const endHourDecimal = startHour + durationToUse;
    const crossesMidnight = endHourDecimal > 24;

    // -------------------------------------------------------------------------
    // 1. CÁLCULO DE COSTE PARA LA PROGRAMACIÓN INDICADA
    //    - currentHourInt va de Math.floor(startHour) hasta lo que necesite.
    //    - Si currentHourInt >= 24 → usamos tomorrowPrices con (currentHourInt - 24).
    //    - Epsilon 1e-9 para evitar bucles infinitos por aritmética de punto flotante.
    // -------------------------------------------------------------------------
    let totalCost = 0;
    let remainingDuration = durationToUse;
    let currentHourInt = Math.floor(startHour);
    const startFraction = startHour - currentHourInt;
    let isFirstSegment = true;
    const calculationDetails: any[] = [];

    while (remainingDuration > 1e-9) {
      const useToday = currentHourInt <= 23;
      const effectiveHourInt = useToday ? currentHourInt : currentHourInt - 24;

      // Salimos si ya no hay más horas disponibles (máximo hasta las 23h de mañana)
      if (effectiveHourInt > 23) break;

      // Si es el primer segmento y empezamos en mitad de una hora,
      // solo están disponibles (1 - startFraction) horas en esa franja.
      const availableInThisHour = isFirstSegment ? (1 - startFraction) : 1;
      const durationInThisHour = Math.min(availableInThisHour, remainingDuration);
      isFirstSegment = false;

      const priceValue = getPriceForHourInt(effectiveHourInt, useToday);
      const costForThisHour = potencyToUse * durationInThisHour * priceValue;
      totalCost += costForThisHour;

      // Mostrar minutos reales en el desglose (ej: "35.0 min" en vez de "0.58h")
      const minutosUsados = durationInThisHour * 60;
      const dayLabel = useToday ? '' : ' (mañana)';

      calculationDetails.push({
        hora: `${effectiveHourInt.toString().padStart(2, '0')}:00${dayLabel}`,
        tiempoUsado: `${minutosUsados.toFixed(1)} min`,
        precioAplicado: `${priceValue.toFixed(4)} €/kWh`,
        costeFranja: `${costForThisHour.toFixed(6)} €`,
      });

      remainingDuration -= durationInThisHour;
      currentHourInt++;
    }

    // -------------------------------------------------------------------------
    // 2. ESCÁNER INTELIGENTE: BUSCAR MEJOR HORA HOY
    //    Solo desde la hora actual en adelante.
    // -------------------------------------------------------------------------
    const currentActualHour = new Date().getHours();
    const avgDayPrice =
      todayPrices.reduce((acc, p) => acc + Number(p.valueKwh), 0) /
      todayPrices.length;
    const durationCeil = Math.ceil(durationToUse);

    let bestCostToday = Infinity;
    let bestStartHourToday = currentActualHour;

    for (let h = currentActualHour; h <= 24 - durationCeil; h++) {
      let tempCost = 0;
      let remDur = durationToUse;
      let cH = h;
      while (remDur > 1e-9 && cH <= 23) {
        const dInH = Math.min(1, remDur);
        tempCost += potencyToUse * dInH * getPriceForHourInt(cH, true);
        remDur -= dInH;
        cH++;
      }
      if (tempCost < bestCostToday) {
        bestCostToday = tempCost;
        bestStartHourToday = h;
      }
    }

    // ── Calcular franja (BARATA / MEDIA / CARA) ──────────────────────────────
    const totalEnergy = potencyToUse * durationToUse;
    const currentAvgPrice = totalEnergy > 0 ? totalCost / totalEnergy : 0;

    let franja = 'MEDIA 🟡';
    if (currentAvgPrice > avgDayPrice * 1.1) franja = 'CARA 🔴';
    else if (currentAvgPrice < avgDayPrice * 0.9) franja = 'BARATA 🟢';

    // -------------------------------------------------------------------------
    // 3. LÓGICA DE MAÑANA
    //    Si no es ya barata o no encontramos mejor opción hoy, miramos mañana.
    // -------------------------------------------------------------------------
    let finalBestHour = bestStartHourToday;
    let finalBestCost = bestCostToday;
    let finalBestDay = 'hoy';
    let avisoManana: string | null = null;

    if (franja !== 'BARATA 🟢' || bestCostToday === Infinity) {
      if (tomorrowPrices.length > 0) {
        let bestCostTomorrow = Infinity;
        let bestStartHourTomorrow = 0;

        for (let h = 0; h <= 24 - durationCeil; h++) {
          let tempCost = 0;
          let remDur = durationToUse;
          let cH = h;
          while (remDur > 1e-9 && cH <= 23) {
            const dInH = Math.min(1, remDur);
            tempCost += potencyToUse * dInH * getPriceForHourInt(cH, false);
            remDur -= dInH;
            cH++;
          }
          if (tempCost < bestCostTomorrow) {
            bestCostTomorrow = tempCost;
            bestStartHourTomorrow = h;
          }
        }

        if (bestCostTomorrow < finalBestCost) {
          finalBestHour = bestStartHourTomorrow;
          finalBestCost = bestCostTomorrow;
          finalBestDay = 'mañana';
        }
      } else {
        avisoManana =
          'Los precios de mañana estarán disponibles a partir de las 21:00h.';
      }
    }

    // Evitar ahorros negativos
    const ahorroCalculado = Math.max(0, totalCost - finalBestCost);

    return {
      dispositivo: device.nombre,
      potencia: `${potencyToUse} kW`,
      duracionTotal: `${durationToUse} h`,
      horaInicio: formatHourLabel(startHour),
      horaFin: formatHourLabel(endHourDecimal),
      cruzaMedianoche: crossesMidnight,
      consumoTotalKwh: totalEnergy.toFixed(4),
      costeTotalEuros: totalCost.toFixed(4),
      desglose: calculationDetails,
      recomendacion: {
        franja,
        horaOptima: finalBestHour,
        diaOptimo: finalBestDay,
        costeOptimo: finalBestCost.toFixed(4),
        ahorro: ahorroCalculado.toFixed(4),
        avisoManana,
      },
    };
  }
}