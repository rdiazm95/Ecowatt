import { Test, TestingModule } from '@nestjs/testing';
import { DevicesService } from './devices.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { NotFoundException } from '@nestjs/common';
import { Programacion } from '../programaciones/entities/programacion.entity'; // ← AÑADIDO

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const mockDevicesRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
};

// ← AÑADIDO: mock del queryBuilder que usa update() al propagar potencia
const mockQueryBuilder = {
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 1 }),
};

// ← AÑADIDO: mock del repositorio de Programacion
const mockProgramacionRepository = {
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
};

// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE PRUEBA REUTILIZABLES
// ─────────────────────────────────────────────────────────────────────────────

const mockDevice: Device = {
  id: 1,
  nombre: 'Lavadora',
  tipo: 'electrodomestico',
  potencia: 2.0,
  duracion: 1.5,
  usuario: { id: 1 } as any,
} as Device;

// ─────────────────────────────────────────────────────────────────────────────
// SUITE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

describe('DevicesService', () => {
  let service: DevicesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // ← AÑADIDO: resetear también los mocks del queryBuilder
    mockQueryBuilder.update.mockReturnThis();
    mockQueryBuilder.set.mockReturnThis();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });
    mockProgramacionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: getRepositoryToken(Device), useValue: mockDevicesRepository },
        { provide: getRepositoryToken(Programacion), useValue: mockProgramacionRepository }, // ← AÑADIDO
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // create()
  // ─────────────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('debería crear un dispositivo vinculado al usuario correcto', async () => {
      mockDevicesRepository.create.mockReturnValue(mockDevice);
      mockDevicesRepository.save.mockResolvedValue(mockDevice);

      const result = await service.create(
        { nombre: 'Lavadora', tipo: 'electrodomestico', potencia: 2.0, duracion: 1.5 },
        1,
      );

      // Debe pasar el userId como relación, no como valor plano
      expect(mockDevicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ usuario: { id: 1 } }),
      );
      expect(result).toEqual(mockDevice);
    });

    it('debería guardar el dispositivo en base de datos tras crearlo', async () => {
      mockDevicesRepository.create.mockReturnValue(mockDevice);
      mockDevicesRepository.save.mockResolvedValue(mockDevice);

      await service.create({ nombre: 'Lavadora' }, 1);

      expect(mockDevicesRepository.save).toHaveBeenCalledWith(mockDevice);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // findAllByUserId()
  // ─────────────────────────────────────────────────────────────────────────

  describe('findAllByUserId()', () => {
    it('debería devolver solo los dispositivos del usuario solicitado', async () => {
      mockDevicesRepository.find.mockResolvedValue([mockDevice]);

      const result = await service.findAllByUserId(1);

      expect(mockDevicesRepository.find).toHaveBeenCalledWith({
        where: { usuario: { id: 1 } },
      });
      expect(result).toEqual([mockDevice]);
    });

    it('debería devolver array vacío si el usuario no tiene dispositivos', async () => {
      mockDevicesRepository.find.mockResolvedValue([]);

      const result = await service.findAllByUserId(99);

      expect(result).toEqual([]);
    });

    it('no debe devolver dispositivos de otros usuarios', async () => {
      // Usuario 1 tiene una lavadora, usuario 2 no tiene nada
      mockDevicesRepository.find.mockImplementation(({ where }) =>
        Promise.resolve(where.usuario.id === 1 ? [mockDevice] : []),
      );

      const resultUser1 = await service.findAllByUserId(1);
      const resultUser2 = await service.findAllByUserId(2);

      expect(resultUser1).toHaveLength(1);
      expect(resultUser2).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // update()
  // ─────────────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('debería actualizar los campos del dispositivo correctamente', async () => {
      mockDevicesRepository.findOne.mockResolvedValue({ ...mockDevice });
      mockDevicesRepository.save.mockImplementation((d) => Promise.resolve(d));

      const result = await service.update(1, 1, { potencia: 3.5 });

      expect(result.potencia).toBe(3.5);
      expect(result.nombre).toBe('Lavadora'); // El resto de campos no cambia
    });

    it('debería lanzar NotFoundException si el dispositivo no existe', async () => {
      mockDevicesRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, 1, { potencia: 3.5 })).rejects.toThrow(
        new NotFoundException('Dispositivo no encontrado o no te pertenece'),
      );

      expect(mockDevicesRepository.save).not.toHaveBeenCalled();
    });

    it('no debe permitir que un usuario modifique dispositivos de otro usuario', async () => {
      // El dispositivo pertenece al usuario 1, pero lo intenta editar el usuario 2
      mockDevicesRepository.findOne.mockImplementation(({ where }) =>
        Promise.resolve(where.usuario.id === 1 ? mockDevice : null),
      );

      await expect(service.update(1, 2, { potencia: 3.5 })).rejects.toThrow(
        NotFoundException,
      );

      expect(mockDevicesRepository.save).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // remove()
  // ─────────────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('debería eliminar el dispositivo del usuario correcto', async () => {
      mockDevicesRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(1, 1);

      expect(mockDevicesRepository.delete).toHaveBeenCalledWith({
        id: 1,
        usuario: { id: 1 },
      });
    });

    it('la query de borrado siempre debe incluir el userId como filtro', async () => {
      mockDevicesRepository.delete.mockResolvedValue({ affected: 0 });

      await service.remove(1, 42);

      // Verificamos que el userId llega al delete y no se borra sin filtro de usuario
      const llamada = mockDevicesRepository.delete.mock.calls[0][0];
      expect(llamada).toHaveProperty('usuario.id', 42);
    });

    it('no debe lanzar error si el dispositivo no existe (delete silencioso)', async () => {
      mockDevicesRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(999, 1)).resolves.not.toThrow();
    });
  });
});