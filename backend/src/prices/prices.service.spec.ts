import { Test, TestingModule } from '@nestjs/testing';
import { PricesService } from './prices.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Price } from './entities/price.entity';
import { EsiosService } from '../esios/esios.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const mockPriceRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const mockEsiosService = {
  getPVPCPrices: jest.fn(),
  getHuellaCarbono: jest.fn(),
};

const mockUsersService = {
  findUsersWithAlertasActivas: jest.fn(),
};

const mockNotificationsService = {
  sendPushNotification: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Genera un array de entidades Price con precios personalizables por hora
const buildPriceEntities = (overrides: Record<number, number> = {}): Price[] =>
  Array.from({ length: 24 }, (_, h) => {
    const valueKwh = overrides[h] ?? 0.10;
    const datetime = new Date(Date.UTC(2025, 0, 1, h, 0, 0));
    return {
      id: h + 1,
      datetime,
      date: datetime,           // campo extra de la entidad
      value: valueKwh * 1000,
      valueKwh,
      carbonFootprint: null,
      geoZone: 'peninsula',
      indicatorId: 1001,
      createdAt: new Date(),    // campo extra de la entidad
    } as unknown as Price;
  });

// ─────────────────────────────────────────────────────────────────────────────
// SUITE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

describe('PricesService', () => {
  let service: PricesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricesService,
        { provide: getRepositoryToken(Price), useValue: mockPriceRepository },
        { provide: EsiosService, useValue: mockEsiosService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<PricesService>(PricesService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getLast30DaysSummary()
  // ─────────────────────────────────────────────────────────────────────────

  describe('getLast30DaysSummary()', () => {
    it('debería devolver un resumen con avg, min y max para cada día con datos', async () => {
      // Simulamos que cada día tiene 24 precios: min 0.05, max 0.20, avg ~0.10
      const mockPrices = buildPriceEntities({ 0: 0.05, 12: 0.20 });
      mockPriceRepository.find.mockResolvedValue(mockPrices);

      const result = await service.getLast30DaysSummary();

      expect(result.length).toBe(30);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('avg');
      expect(result[0]).toHaveProperty('min');
      expect(result[0]).toHaveProperty('max');
      // El mínimo debe ser menor o igual al avg, y el avg menor o igual al max
      expect(result[0].min).toBeLessThanOrEqual(result[0].avg);
      expect(result[0].avg).toBeLessThanOrEqual(result[0].max);
    });

    it('debería omitir días sin datos en lugar de devolver NaN', async () => {
      // Días pares con datos, días impares sin datos
      mockPriceRepository.find.mockImplementation((opts) => {
        const start: Date = opts.where.datetime._value[0];
        const dayOfMonth = start.getUTCDate();
        return Promise.resolve(dayOfMonth % 2 === 0 ? buildPriceEntities() : []);
      });

      const result = await service.getLast30DaysSummary();

      // Ningún resultado debe tener NaN
      result.forEach((r) => {
        expect(isNaN(r.avg)).toBe(false);
        expect(isNaN(r.min)).toBe(false);
        expect(isNaN(r.max)).toBe(false);
      });
    });

    it('debería calcular avg con 4 decimales de precisión', async () => {
      // Precios irregulares para forzar decimales
      const mockPrices = buildPriceEntities({ 0: 0.11111, 1: 0.22222, 2: 0.33333 });
      mockPriceRepository.find.mockResolvedValue(mockPrices);

      const result = await service.getLast30DaysSummary();

      // avg no debe tener más de 4 decimales
      result.forEach((r) => {
        const decimals = r.avg.toString().split('.')[1]?.length ?? 0;
        expect(decimals).toBeLessThanOrEqual(4);
      });
    });
  });
  // ─────────────────────────────────────────────────────────────────────────
  // cleanOldPrices()
  // ─────────────────────────────────────────────────────────────────────────

  describe('cleanOldPrices()', () => {
    it('debería eliminar precios con más de 29 días de antigüedad', async () => {
      mockPriceRepository.delete.mockResolvedValue({ affected: 48 });

      await service.cleanOldPrices();

      expect(mockPriceRepository.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          datetime: expect.anything(), // LessThan(cutoff)
        }),
      );
    });

    it('debería ejecutarse sin lanzar errores aunque no haya nada que borrar', async () => {
      mockPriceRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.cleanOldPrices()).resolves.not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fetchAndSavePrices()
  // ─────────────────────────────────────────────────────────────────────────

  describe('fetchAndSavePrices()', () => {
    const mockEsiosResponse = {
      indicator: {
        values: Array.from({ length: 24 }, (_, h) => ({
          datetime: `2025-01-01T${String(h).padStart(2, '0')}:00:00+01:00`,
          value: 100, // 100 Wh/kWh → 0.10 €/kWh
        })),
      },
    };

    it('debería guardar los precios cuando no existen en base de datos', async () => {
      mockEsiosService.getPVPCPrices.mockResolvedValue(mockEsiosResponse);
      mockEsiosService.getHuellaCarbono.mockResolvedValue({ indicator: { values: [] } });
      mockPriceRepository.create.mockImplementation((dto) => dto);
      mockPriceRepository.findOne.mockResolvedValue(null); // No existen aún
      mockPriceRepository.save.mockImplementation((p) => Promise.resolve({ id: 1, ...p }));

      const result = await service.fetchAndSavePrices(new Date('2025-01-01'));

      expect(mockPriceRepository.save).toHaveBeenCalledTimes(24);
      expect(result).toHaveLength(24);
    });

    it('no debería duplicar precios que ya existen en base de datos', async () => {
      mockEsiosService.getPVPCPrices.mockResolvedValue(mockEsiosResponse);
      mockEsiosService.getHuellaCarbono.mockResolvedValue({ indicator: { values: [] } });
      mockPriceRepository.create.mockImplementation((dto) => dto);
      // Todos los precios ya existen y tienen carbonFootprint
      mockPriceRepository.findOne.mockResolvedValue({
        id: 1,
        valueKwh: 0.10,
        carbonFootprint: 150,
      });

      const result = await service.fetchAndSavePrices(new Date('2025-01-01'));

      // No debe guardar nada nuevo porque ya existían con CO2
      expect(mockPriceRepository.save).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('debería continuar guardando precios aunque falle la huella de carbono', async () => {
      mockEsiosService.getPVPCPrices.mockResolvedValue(mockEsiosResponse);
      mockEsiosService.getHuellaCarbono.mockRejectedValue(new Error('ESIOS CO2 no disponible'));
      mockPriceRepository.create.mockImplementation((dto) => dto);
      mockPriceRepository.findOne.mockResolvedValue(null);
      mockPriceRepository.save.mockImplementation((p) => Promise.resolve({ id: 1, ...p }));

      // No debe lanzar error aunque CO2 falle
      await expect(service.fetchAndSavePrices(new Date('2025-01-01'))).resolves.not.toThrow();
      // Y los precios sí deben guardarse
      expect(mockPriceRepository.save).toHaveBeenCalled();
    });
  });
});