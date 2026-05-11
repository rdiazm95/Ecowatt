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
    horaFinParam?: number, // ✅ NUEVO: hora fin real (puede ser > 24 si cruza medianoche)
  ) {
    if (startHour < 0 || startHour >= 24) {
      throw new BadRequestException('La hora de inicio debe estar entre 0 y 23.99');
    }

    const devices = await this.devicesService.findAllByUserId(userId);
    const device = devices.find(d => d.id === deviceId);
    if (!device) throw new NotFoundException('Dispositivo no encontrado');

    const durationToUse = customDuracion !== undefined ? customDuracion : Number(device.duracion);
    const potencyToUse  = customPotencia !== undefined ? customPotencia : Number(device.potencia);

    // ✅ Determinar si la programación cruza medianoche
    // horaFinParam > 24 indica cruce de medianoche (ej: 25.25 = 01:15 día siguiente)
    const horaFinDecimal = horaFinParam !== undefined ? horaFinParam : startHour + durationToUse;
    const crossesMidnight = horaFinDecimal > 24;

    const todayPrices = await this.pricesService.getTodayPrices();
    if (!todayPrices || todayPrices.length === 0) {
      throw new BadRequestException('No hay precios disponibles hoy');
    }

    // ✅ Cargar precios de mañana si la programación cruza medianoche
    let tomorrowPricesForCalc: any[] | null = null;
    let sinPreciosMañana = false;

    if (crossesMidnight) {
      try {
        const tp = await this.pricesService.getTomorrowPrices();
        if (tp && tp.length > 0) {
          tomorrowPricesForCalc = tp;
        } else {
          sinPreciosMañana = true;
        }
      } catch {
        sinPreciosMañana = true;
      }
    }

    // Helper: formatea un decimal de hora a "HH:MM"
    const formatHourLabel = (h: number): string => {
      const normalized = h >= 24 ? h - 24 : h;
      const hh = Math.floor(normalized).toString().padStart(2, '0');
      const mm = Math.round((normalized - Math.floor(normalized)) * 60).toString().padStart(2, '0');
      return `${hh}:${mm}`;
    };

    /**
     * Dado un currentHourInt (0-47), devuelve el precio €/kWh correcto:
     * - 0-23  → todayPrices
     * - 24-47 → tomorrowPricesForCalc (si están disponibles) o último precio de hoy
     */
    const getPriceForHour = (hourInt: number): number => {
      const hourOfDay = hourInt % 24; // normalizar a 0-23

      if (hourInt < 24) {
        const entry = todayPrices.find(
          p => new Date(p.datetime).getHours() === hourOfDay,
        );
        return entry ? Number(entry.valueKwh) : 0;
      } else {
        // Hora del día siguiente
        if (tomorrowPricesForCalc && tomorrowPricesForCalc.length > 0) {
          const entry = tomorrowPricesForCalc.find(
            p => new Date(p.datetime).getHours() === hourOfDay,
          );
          return entry ? Number(entry.valueKwh) : 0;
        }
        // Sin precios de mañana → usar precio de la misma hora de hoy como estimación
        const entry = todayPrices.find(
          p => new Date(p.datetime).getHours() === hourOfDay,
        );
        return entry ? Number(entry.valueKwh) : 0;
      }
    };

    // -------------------------------------------------------------------------
    // 1. CÁLCULO DE LA SIMULACIÓN ACTUAL
    //    Soporta cruce de medianoche: currentHourInt puede llegar hasta 47
    // -------------------------------------------------------------------------
    let totalCost = 0;
    let remainingDuration = durationToUse;

    let currentHourInt = Math.floor(startHour);
    const startFraction = startHour - currentHourInt;
    let isFirstSegment = true;

    const calculationDetails: any[] = [];

    // ✅ FIX CLAVE: límite 47 en vez de 23, para permitir cruce de medianoche
    while (remainingDuration > 0.0001 && currentHourInt <= 47) {
      const availableInThisHour = isFirstSegment ? (1 - startFraction) : 1;
      const durationInThisHour  = Math.min(availableInThisHour, remainingDuration);
      isFirstSegment = false;

      const priceValue = getPriceForHour(currentHourInt);
      const costForThisHour = potencyToUse * durationInThisHour * priceValue;
      totalCost += costForThisHour;

      // Etiqueta de hora para el desglose: si es día siguiente, indicar (+1)
      const hourOfDay   = currentHourInt % 24;
      const dayLabel    = currentHourInt >= 24 ? ' (+1)' : '';
      const horaLabel   = `${hourOfDay.toString().padStart(2, '0')}:00${dayLabel}`;

      calculationDetails.push({
        hora:           horaLabel,
        tiempoUsado:    `${durationInThisHour.toFixed(2)}h`,
        precioAplicado: `${priceValue.toFixed(4)} €/kWh`,
        costeFranja:    `${costForThisHour.toFixed(4)} €`,
      });

      remainingDuration -= durationInThisHour;
      currentHourInt++;
    }

    // -------------------------------------------------------------------------
    // 2. ESCÁNER INTELIGENTE: BUSCAR MEJOR HORA HOY
    //    También soporta cruce de medianoche en el escáner
    // -------------------------------------------------------------------------
    const currentActualHour = new Date().getHours();
    let bestCostToday    = Infinity;
    let bestStartHourToday = currentActualHour;

    const avgDayPrice  = todayPrices.reduce((acc, p) => acc + Number(p.valueKwh), 0) / todayPrices.length;
    const durationInt  = Math.ceil(durationToUse);

    // Escanear desde hora actual hasta el final del día (o cruzando medianoche)
    for (let h = currentActualHour; h <= 24 - durationInt; h++) {
      let tempCost = 0;
      let remDur   = durationToUse;
      let cH       = h;
      // ✅ Permite que el escáner también cruce medianoche
      while (remDur > 0.0001 && cH <= 47) {
        const dInH   = Math.min(1, remDur);
        const pVal   = getPriceForHour(cH);
        tempCost    += potencyToUse * dInH * pVal;
        remDur      -= dInH;
        cH++;
      }
      if (tempCost < bestCostToday) {
        bestCostToday      = tempCost;
        bestStartHourToday = h;
      }
    }

    // Calcular franja actual
    const totalEnergy    = potencyToUse * durationToUse;
    const currentAvgPrice = totalEnergy > 0 ? (totalCost / totalEnergy) : 0;

    let franja = 'MEDIA 🟡';
    if (currentAvgPrice > avgDayPrice * 1.1) franja = 'CARA 🔴';
    else if (currentAvgPrice < avgDayPrice * 0.9) franja = 'BARATA 🟢';

    // -------------------------------------------------------------------------
    // 3. LÓGICA DE MAÑANA
    // -------------------------------------------------------------------------
    let finalBestHour = bestStartHourToday;
    let finalBestCost = bestCostToday;
    let finalBestDay  = 'hoy';
    let avisoManana: string | null = null;

    if (franja !== 'BARATA 🟢' || bestCostToday === Infinity) {
      try {
        // ✅ Reutilizar tomorrowPricesForCalc si ya las cargamos, o cargar ahora
        let tomorrowPrices = tomorrowPricesForCalc;
        if (!tomorrowPrices) {
          tomorrowPrices = await this.pricesService.getTomorrowPrices();
        }

        if (tomorrowPrices && tomorrowPrices.length > 0) {
          let bestCostTomorrow     = Infinity;
          let bestStartHourTomorrow = 0;

          for (let h = 0; h <= 24 - durationInt; h++) {
            let tempCost = 0;
            let remDur   = durationToUse;
            let cH       = h;
            while (remDur > 0.0001 && cH <= 23) {
              const dInH = Math.min(1, remDur);
              const p    = tomorrowPrices.find(x => new Date(x.datetime).getHours() === cH);
              const pVal = p ? Number(p.valueKwh) : 0;
              tempCost  += potencyToUse * dInH * pVal;
              remDur    -= dInH;
              cH++;
            }
            if (tempCost < bestCostTomorrow) {
              bestCostTomorrow      = tempCost;
              bestStartHourTomorrow = h;
            }
          }

          if (bestCostTomorrow < bestCostToday) {
            finalBestHour = bestStartHourTomorrow;
            finalBestCost = bestCostTomorrow;
            finalBestDay  = 'mañana';
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
      dispositivo:      device.nombre,
      potencia:         `${potencyToUse} kW`,
      duracionTotal:    `${durationToUse} h`,
      horaInicio:       formatHourLabel(startHour),
      consumoTotalKwh:  totalEnergy.toFixed(2),
      costeTotalEuros:  totalCost.toFixed(2),
      // ✅ NUEVO: indica al frontend si los precios del día siguiente no están disponibles
      sinPreciosMañana,
      desglose: calculationDetails,
      recomendacion: {
        franja,
        horaOptima:  finalBestHour,
        diaOptimo:   finalBestDay,
        costeOptimo: finalBestCost.toFixed(2),
        ahorro:      ahorroCalculado.toFixed(2),
        avisoManana,
      },
    };
  }
}