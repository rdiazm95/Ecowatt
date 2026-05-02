import { Test, TestingModule } from '@nestjs/testing';
import { SimulatorService } from './simulator.service';
import { DevicesService } from '../devices/devices.service';
import { PricesService } from '../prices/prices.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const mockDevicesService = {
  findAllByUserId: jest.fn(),
};

const mockPricesService = {
  getTodayPrices: jest.fn(),
  getTomorrowPrices: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE PRUEBA REUTILIZABLES
// ─────────────────────────────────────────────────────────────────────────────

const mockDevice = {
  id: 1,
  nombre: 'Lavadora',
  tipo: 'electrodomestico',
  potencia: 2.0,   // kW
  duracion: 1.5,   // horas
};

// 24 precios simulados, uno por hora (precio fijo de 0.10 €/kWh salvo horas punta)
const buildMockPrices = (overrides: Record<number, number> = {}) =>
  Array.from({ length: 24 }, (_, h) => ({
    datetime: new Date(2025, 0, 1, h, 0, 0).toISOString(),
    valueKwh: overrides[h] ?? 0.10,
  }));

// ─────────────────────────────────────────────────────────────────────────────
// SUITE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulatorService', () => {
  let service: SimulatorService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulatorService,
        { provide: DevicesService, useValue: mockDevicesService },
        { provide: PricesService, useValue: mockPricesService },
      ],
    }).compile();

    service = module.get<SimulatorService>(SimulatorService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Validaciones de entrada
  // ─────────────────────────────────────────────────────────────────────────

  describe('Validaciones de entrada', () => {
    it('debería lanzar BadRequestException si startHour es negativo', async () => {
      await expect(service.calculateCost(1, 1, -1)).rejects.toThrow(
        new BadRequestException('La hora de inicio debe estar entre 0 y 23.99'),
      );
    });

    it('debería lanzar BadRequestException si startHour es 24 o mayor', async () => {
      await expect(service.calculateCost(1, 1, 24)).rejects.toThrow(
        new BadRequestException('La hora de inicio debe estar entre 0 y 23.99'),
      );
    });

    it('debería lanzar NotFoundException si el dispositivo no pertenece al usuario', async () => {
      mockDevicesService.findAllByUserId.mockResolvedValue([mockDevice]);

      await expect(service.calculateCost(1, 999, 10)).rejects.toThrow(
        new NotFoundException('Dispositivo no encontrado'),
      );
    });

    it('debería lanzar BadRequestException si no hay precios disponibles hoy', async () => {
      mockDevicesService.findAllByUserId.mockResolvedValue([mockDevice]);
      mockPricesService.getTodayPrices.mockResolvedValue([]);

      await expect(service.calculateCost(1, 1, 10)).rejects.toThrow(
        new BadRequestException('No hay precios disponibles hoy'),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cálculo de coste
  // ─────────────────────────────────────────────────────────────────────────

  describe('calculateCost() — cálculo correcto', () => {
    beforeEach(() => {
      mockDevicesService.findAllByUserId.mockResolvedValue([mockDevice]);
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);
    });

    it('debería calcular el coste correctamente con precios uniformes', async () => {
      // Precio uniforme 0.10 €/kWh en todas las horas
      mockPricesService.getTodayPrices.mockResolvedValue(buildMockPrices());

      const result = await service.calculateCost(1, 1, 10);

      // 2.0 kW × 1.5 h × 0.10 €/kWh = 0.30 €
      expect(result.costeTotalEuros).toBe('0.30');
      expect(result.consumoTotalKwh).toBe('3.00');
      expect(result.dispositivo).toBe('Lavadora');
    });

    it('debería usar potencia y duración custom si se proporcionan', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue(buildMockPrices());

      // Potencia custom: 1.0 kW, Duración custom: 2 h
      const result = await service.calculateCost(1, 1, 10, 2, 1.0);

      // 1.0 kW × 2 h × 0.10 €/kWh = 0.20 €
      expect(result.costeTotalEuros).toBe('0.20');
      expect(result.potencia).toBe('1 kW');
      expect(result.duracionTotal).toBe('2 h');
    });

    it('debería distribuir el coste entre varias franjas horarias', async () => {
      // Hora 10 → 0.10 €/kWh, Hora 11 → 0.20 €/kWh
      mockPricesService.getTodayPrices.mockResolvedValue(
        buildMockPrices({ 10: 0.10, 11: 0.20 }),
      );

      const result = await service.calculateCost(1, 1, 10);

      // 1h a 0.10 + 0.5h a 0.20 → 2kW*(1*0.10 + 0.5*0.20) = 2*(0.10+0.10) = 0.40 €
      expect(result.costeTotalEuros).toBe('0.40');
      expect(result.desglose).toHaveLength(2);
    });

    it('debería manejar startHour decimal correctamente (ej: 10:30 = 10.5)', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue(
        buildMockPrices({ 10: 0.10, 11: 0.10, 12: 0.10 }),
      );

      const result = await service.calculateCost(1, 1, 10.5);

      // Empieza a las 10:30 — en hora 10 solo quedan 0.5h, luego 1h en hora 11
      expect(result.horaInicio).toBe('10:30');
      // 2kW × (0.5h + 1h) × 0.10 = 0.30 €
      expect(result.costeTotalEuros).toBe('0.30');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Recomendación de hora óptima
  // ─────────────────────────────────────────────────────────────────────────

  describe('calculateCost() — recomendación', () => {
    beforeEach(() => {
      mockDevicesService.findAllByUserId.mockResolvedValue([mockDevice]);
    });

    it('debería identificar la hora óptima (la más barata del día)', async () => {
      // Hora 3 es la más barata con 0.05 €/kWh
      mockPricesService.getTodayPrices.mockResolvedValue(
        buildMockPrices({ 3: 0.05, 4: 0.05 }),
      );
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);

      const result = await service.calculateCost(1, 1, 15);

      expect(result.recomendacion.costeOptimo).toBeDefined();
      // El coste óptimo debe ser menor o igual al coste simulado
      expect(Number(result.recomendacion.costeOptimo)).toBeLessThanOrEqual(
        Number(result.costeTotalEuros),
      );
    });

    it('el ahorro nunca debe ser negativo', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue(buildMockPrices());
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);

      const result = await service.calculateCost(1, 1, 10);

      expect(Number(result.recomendacion.ahorro)).toBeGreaterThanOrEqual(0);
    });

    it('debería incluir aviso de mañana si los precios no están disponibles', async () => {
      // Precios de hoy muy caros para forzar la búsqueda de mañana
      mockPricesService.getTodayPrices.mockResolvedValue(buildMockPrices({ 10: 0.50 }));
      mockPricesService.getTomorrowPrices.mockRejectedValue(new Error('No disponible'));

      const result = await service.calculateCost(1, 1, 10);

      expect(result.recomendacion.avisoManana).toContain('21:00h');
    });

    it('debería recomendar mañana si es más barato que hoy', async () => {
      // Hoy caro (0.30 €/kWh), mañana muy barato (0.05 €/kWh)
      mockPricesService.getTodayPrices.mockResolvedValue(buildMockPrices({ 10: 0.30 }));
      mockPricesService.getTomorrowPrices.mockResolvedValue(
        buildMockPrices({ 0: 0.05, 1: 0.05 }),
      );

      const result = await service.calculateCost(1, 1, 10);

      expect(result.recomendacion.diaOptimo).toBe('mañana');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Estructura de respuesta
  // ─────────────────────────────────────────────────────────────────────────

  describe('calculateCost() — estructura de respuesta', () => {
    it('debería devolver todos los campos esperados en la respuesta', async () => {
      mockDevicesService.findAllByUserId.mockResolvedValue([mockDevice]);
      mockPricesService.getTodayPrices.mockResolvedValue(buildMockPrices());
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);

      const result = await service.calculateCost(1, 1, 10);

      expect(result).toHaveProperty('dispositivo');
      expect(result).toHaveProperty('potencia');
      expect(result).toHaveProperty('duracionTotal');
      expect(result).toHaveProperty('horaInicio');
      expect(result).toHaveProperty('consumoTotalKwh');
      expect(result).toHaveProperty('costeTotalEuros');
      expect(result).toHaveProperty('desglose');
      expect(result).toHaveProperty('recomendacion');
      expect(result.recomendacion).toHaveProperty('franja');
      expect(result.recomendacion).toHaveProperty('horaOptima');
      expect(result.recomendacion).toHaveProperty('diaOptimo');
      expect(result.recomendacion).toHaveProperty('costeOptimo');
      expect(result.recomendacion).toHaveProperty('ahorro');
    });
  });
});