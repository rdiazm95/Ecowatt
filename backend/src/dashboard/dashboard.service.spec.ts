import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PricesService } from '../prices/prices.service';

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const mockPricesService = {
  getTodayPrices: jest.fn(),
  getCurrentPrice: jest.fn(),
  getTomorrowPrices: jest.fn(),
  getLast30DaysSummary: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const buildPriceEntities = (overrides: Record<number, number> = {}) =>
  Array.from({ length: 24 }, (_, h) => ({
    datetime: new Date(Date.UTC(2025, 0, 1, h, 0, 0)),
    value: (overrides[h] ?? 0.10) * 1000,
    valueKwh: overrides[h] ?? 0.10,
  }));

// ─────────────────────────────────────────────────────────────────────────────
// SUITE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PricesService, useValue: mockPricesService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getTodayDashboard()
  // ─────────────────────────────────────────────────────────────────────────

  describe('getTodayDashboard()', () => {
    it('debería devolver la estructura completa del dashboard', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue(buildPriceEntities());
      mockPricesService.getCurrentPrice.mockResolvedValue(buildPriceEntities()[10]);
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);

      const result = await service.getTodayDashboard();

      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('today');
      expect(result).toHaveProperty('tomorrow');
      expect(result.today).toHaveProperty('prices');
      expect(result.today).toHaveProperty('min');
      expect(result.today).toHaveProperty('max');
      expect(result.today).toHaveProperty('avg');
    });

    it('debería calcular min, max y avg correctamente', async () => {
      // Hora 5 la más barata (0.05), hora 20 la más cara (0.30), resto 0.10
      mockPricesService.getTodayPrices.mockResolvedValue(
        buildPriceEntities({ 5: 0.05, 20: 0.30 }),
      );
      mockPricesService.getCurrentPrice.mockResolvedValue(null);
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);

      const result = await service.getTodayDashboard();

      expect(result.today.min).toBe(0.05);
      expect(result.today.max).toBe(0.30);
      expect(result.today.avg).toBeGreaterThan(0);
    });

    it('debería mapear cada precio con su hora UTC correctamente', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue(buildPriceEntities());
      mockPricesService.getCurrentPrice.mockResolvedValue(null);
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);

      const result = await service.getTodayDashboard();

      expect(result.today.prices).toHaveLength(24);
      // Hora 0 → hour: 0, Hora 10 → hour: 10
      expect(result.today.prices[0].hour).toBe(0);
      expect(result.today.prices[10].hour).toBe(10);
    });

    it('current debe ser null si no hay precio para la hora actual', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue(buildPriceEntities());
      mockPricesService.getCurrentPrice.mockResolvedValue(null);
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);

      const result = await service.getTodayDashboard();

      expect(result.current).toBeNull();
    });

    it('current debe incluir datetime, priceKwh y priceMwh si hay precio actual', async () => {
      const currentPrice = buildPriceEntities()[12]; // Hora 12
      mockPricesService.getTodayPrices.mockResolvedValue(buildPriceEntities());
      mockPricesService.getCurrentPrice.mockResolvedValue(currentPrice);
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);

      const result = await service.getTodayDashboard();

      expect(result.current).not.toBeNull();
      expect(result.current).toHaveProperty('datetime');
      expect(result.current).toHaveProperty('priceKwh');
      expect(result.current).toHaveProperty('priceMwh');
    });

    it('debería devolver min/max/avg a null si no hay precios de mañana', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue(buildPriceEntities());
      mockPricesService.getCurrentPrice.mockResolvedValue(null);
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);

      const result = await service.getTodayDashboard();

      expect(result.tomorrow.hasPrices).toBe(false);
      expect(result.tomorrow.min).toBeNull();
      expect(result.tomorrow.max).toBeNull();
      expect(result.tomorrow.avg).toBeNull();
      expect(result.tomorrow.message).toContain('21:00');
    });

    it('debería devolver los precios de mañana con hasPrices true cuando están disponibles', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue(buildPriceEntities());
      mockPricesService.getCurrentPrice.mockResolvedValue(null);
      mockPricesService.getTomorrowPrices.mockResolvedValue(buildPriceEntities({ 3: 0.05 }));

      const result = await service.getTodayDashboard();

      expect(result.tomorrow.hasPrices).toBe(true);
      expect(result.tomorrow.prices).toHaveLength(24);
      expect(result.tomorrow.min).toBe(0.05);
      expect(result.tomorrow.message).toContain('disponibles');
    });

    it('debe devolver min/max/avg con máximo 4 decimales de precisión', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue(
        buildPriceEntities({ 0: 0.11111, 1: 0.22222 }),
      );
      mockPricesService.getCurrentPrice.mockResolvedValue(null);
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);

      const result = await service.getTodayDashboard();

      const avgDecimals = result.today.avg.toString().split('.')[1]?.length ?? 0;
      expect(avgDecimals).toBeLessThanOrEqual(4);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getHistoryDashboard()
  // ─────────────────────────────────────────────────────────────────────────

  describe('getHistoryDashboard()', () => {
    it('debería delegar directamente en getLast30DaysSummary de PricesService', async () => {
      const mockHistory = [
        { date: '2025-01-01', avg: 0.12, min: 0.05, max: 0.25 },
        { date: '2025-01-02', avg: 0.11, min: 0.04, max: 0.22 },
      ];
      mockPricesService.getLast30DaysSummary.mockResolvedValue(mockHistory);

      const result = await service.getHistoryDashboard();

      expect(mockPricesService.getLast30DaysSummary).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockHistory);
    });

    it('debería devolver array vacío si no hay histórico', async () => {
      mockPricesService.getLast30DaysSummary.mockResolvedValue([]);

      const result = await service.getHistoryDashboard();

      expect(result).toEqual([]);
    });
  });
});