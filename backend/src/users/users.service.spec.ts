import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { NotFoundException } from '@nestjs/common';

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const mockUsersRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE PRUEBA REUTILIZABLES
// ─────────────────────────────────────────────────────────────────────────────

const mockUser: Partial<User> = {
  id: 1,
  email: 'test@ecowatt.com',
  passwordHash: 'hashed_password',
  alertaPrecioActiva: false,
  alertaPrecioObjetivo: 0.15,
  expoPushToken: 'ExponentPushToken[xxxx]',
  resetPasswordCode: null,
  resetPasswordExpires: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // findOneByEmail()
  // ─────────────────────────────────────────────────────────────────────────

  describe('findOneByEmail()', () => {
    it('debería devolver el usuario si el email existe', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOneByEmail('test@ecowatt.com');

      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@ecowatt.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('debería devolver null si el email no existe', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.findOneByEmail('noexiste@ecowatt.com');

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // create()
  // ─────────────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('debería crear y guardar un usuario con email y passwordHash', async () => {
      mockUsersRepository.create.mockReturnValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(mockUser);

      const result = await service.create('test@ecowatt.com', 'hashed_password');

      expect(mockUsersRepository.create).toHaveBeenCalledWith({
        email: 'test@ecowatt.com',
        passwordHash: 'hashed_password',
      });
      expect(mockUsersRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateAlertSettings()
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateAlertSettings()', () => {
    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateAlertSettings(999, true, 0.20),
      ).rejects.toThrow(new NotFoundException('Usuario no encontrado'));

      expect(mockUsersRepository.save).not.toHaveBeenCalled();
    });

    it('debería actualizar token cuando se activan alertas con nuevo token', async () => {
      const user = { ...mockUser, expoPushToken: null };
      mockUsersRepository.findOne.mockResolvedValue(user);
      mockUsersRepository.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.updateAlertSettings(
        1, true, 0.20, 'ExponentPushToken[nuevo]',
      );

      expect(result.expoPushToken).toBe('ExponentPushToken[nuevo]');
      expect(result.alertaPrecioActiva).toBe(true);
      expect(result.alertaPrecioObjetivo).toBe(0.20);
    });

    it('debería limpiar el token cuando se desactivan las alertas sin pasar token', async () => {
      const user = { ...mockUser, alertaPrecioActiva: true, expoPushToken: 'ExponentPushToken[viejo]' };
      mockUsersRepository.findOne.mockResolvedValue(user);
      mockUsersRepository.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.updateAlertSettings(1, false, 0.20);

      expect(result.expoPushToken).toBeNull();
      expect(result.alertaPrecioActiva).toBe(false);
    });

    it('debería mantener el token existente si las alertas siguen activas y no llega token nuevo', async () => {
      const user = { ...mockUser, alertaPrecioActiva: true, expoPushToken: 'ExponentPushToken[existente]' };
      mockUsersRepository.findOne.mockResolvedValue(user);
      mockUsersRepository.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.updateAlertSettings(1, true, 0.25);

      // Token no debe cambiar
      expect(result.expoPushToken).toBe('ExponentPushToken[existente]');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getUsersWithActiveAlerts()
  // ─────────────────────────────────────────────────────────────────────────

  describe('getUsersWithActiveAlerts()', () => {
    it('debería devolver solo usuarios con alerta activa y token no nulo', async () => {
      mockUsersRepository.find.mockResolvedValue([mockUser]);

      const result = await service.getUsersWithActiveAlerts();

      expect(mockUsersRepository.find).toHaveBeenCalledWith({
        where: {
          alertaPrecioActiva: true,
          expoPushToken: expect.anything(), // Not(IsNull())
        },
      });
      expect(result).toHaveLength(1);
    });

    it('debería devolver array vacío si no hay usuarios con alertas activas', async () => {
      mockUsersRepository.find.mockResolvedValue([]);

      const result = await service.getUsersWithActiveAlerts();

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // saveResetToken()
  // ─────────────────────────────────────────────────────────────────────────

  describe('saveResetToken()', () => {
    it('debería guardar el código y la fecha de expiración en el usuario', async () => {
      const user = { ...mockUser };
      mockUsersRepository.findOne.mockResolvedValue(user);
      mockUsersRepository.save.mockImplementation((u) => Promise.resolve(u));

      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      const result = await service.saveResetToken(1, '123456', expires);

      expect(result.resetPasswordCode).toBe('123456');
      expect(result.resetPasswordExpires).toEqual(expires);
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.saveResetToken(999, '123456', new Date())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updatePassword()
  // ─────────────────────────────────────────────────────────────────────────

  describe('updatePassword()', () => {
    it('debería actualizar el passwordHash y limpiar el código de reset', async () => {
      const user = { ...mockUser, resetPasswordCode: '123456', resetPasswordExpires: new Date() };
      mockUsersRepository.findOne.mockResolvedValue(user);
      mockUsersRepository.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.updatePassword(1, 'nuevo_hash');

      expect(result.passwordHash).toBe('nuevo_hash');
      expect(result.resetPasswordCode).toBeNull();
      expect(result.resetPasswordExpires).toBeNull();
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.updatePassword(999, 'nuevo_hash')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});