import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const mockUsersService = {
  findOneByEmail: jest.fn(),
  create: jest.fn(),
  saveResetToken: jest.fn(),
  updatePassword: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock_jwt_token'),
};

const mockMailerService = {
  sendMail: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE PRUEBA REUTILIZABLES
// ─────────────────────────────────────────────────────────────────────────────

const mockUser = {
  id: 1,
  email: 'test@ecowatt.com',
  passwordHash: 'hashed_password_123',
  fechaRegistro: new Date(),
  dispositivos: [],
  alertaPrecioActiva: false,
  alertaPrecioObjetivo: null,
  expoPushToken: null,
  resetPasswordCode: null,
  resetPasswordExpires: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailerService, useValue: mockMailerService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // register()
  // ─────────────────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('debería registrar un nuevo usuario y devolver los datos sin passwordHash', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register('test@ecowatt.com', 'password123');

      expect(mockUsersService.findOneByEmail).toHaveBeenCalledWith('test@ecowatt.com');
      expect(mockUsersService.create).toHaveBeenCalledWith(
        'test@ecowatt.com',
        expect.any(String),
      );
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('email', 'test@ecowatt.com');
    });

    it('debería lanzar BadRequestException si el email ya está registrado', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);

      await expect(service.register('test@ecowatt.com', 'password123')).rejects.toThrow(
        new BadRequestException('El email ya está registrado'),
      );

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('debería almacenar la contraseña como hash bcrypt, nunca en texto plano', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      await service.register('test@ecowatt.com', 'password123');

      const llamada = mockUsersService.create.mock.calls[0];
      const hashGuardado = llamada[1];

      expect(hashGuardado).not.toBe('password123');
      expect(hashGuardado).toMatch(/^\$2[ab]\$/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // login()
  // ─────────────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('debería devolver access_token y datos del usuario con credenciales correctas', async () => {
      const realHash = await bcrypt.hash('password123', 10);
      mockUsersService.findOneByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: realHash,
      });

      const result = await service.login('test@ecowatt.com', 'password123');

      expect(result).toHaveProperty('access_token', 'mock_jwt_token');
      expect(result.user).toEqual({ id: 1, email: 'test@ecowatt.com' });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: 1,
        email: 'test@ecowatt.com',
      });
    });

    it('debería lanzar UnauthorizedException si el usuario no existe', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);

      await expect(service.login('noexiste@ecowatt.com', 'password123')).rejects.toThrow(
        new UnauthorizedException('Credenciales incorrectas'),
      );
    });

    it('debería lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      const realHash = await bcrypt.hash('password123', 10);
      mockUsersService.findOneByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: realHash,
      });

      await expect(service.login('test@ecowatt.com', 'contraseña_incorrecta')).rejects.toThrow(
        new UnauthorizedException('Credenciales incorrectas'),
      );

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getUserProfile()
  // ─────────────────────────────────────────────────────────────────────────

  describe('getUserProfile()', () => {
    it('debería devolver el perfil del usuario sin passwordHash', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);

      const result = await service.getUserProfile('test@ecowatt.com');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('email', 'test@ecowatt.com');
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);

      await expect(service.getUserProfile('noexiste@ecowatt.com')).rejects.toThrow(
        new NotFoundException('Usuario no encontrado'),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // forgotPassword()
  // ─────────────────────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('debería guardar el token y enviar el correo si el usuario existe', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      mockUsersService.saveResetToken.mockResolvedValue(mockUser);
      mockMailerService.sendMail.mockResolvedValue(undefined);

      const result = await service.forgotPassword('test@ecowatt.com');

      expect(mockUsersService.saveResetToken).toHaveBeenCalledWith(
        1,
        expect.stringMatching(/^\d{6}$/),
        expect.any(Date),
      );
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'test@ecowatt.com' }),
      );
      expect(result).toEqual({ message: 'Correo de recuperación enviado con éxito' });
    });

    it('debería lanzar NotFoundException si el correo no está registrado', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);

      await expect(service.forgotPassword('noexiste@ecowatt.com')).rejects.toThrow(
        new NotFoundException('No existe ninguna cuenta con este correo.'),
      );

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });

    it('debería lanzar InternalServerErrorException si el servidor de correo falla', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      mockUsersService.saveResetToken.mockResolvedValue(mockUser);
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP connection refused'));

      await expect(service.forgotPassword('test@ecowatt.com')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // resetPassword()
  // ─────────────────────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    const validFutureDate = new Date(Date.now() + 10 * 60 * 1000);
    const expiredDate = new Date(Date.now() - 5 * 60 * 1000);

    it('debería actualizar la contraseña con código válido y no caducado', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({
        ...mockUser,
        resetPasswordCode: '123456',
        resetPasswordExpires: validFutureDate,
      });
      mockUsersService.updatePassword.mockResolvedValue(mockUser);

      const result = await service.resetPassword('test@ecowatt.com', '123456', 'nuevaPassword123');

      expect(mockUsersService.updatePassword).toHaveBeenCalledWith(
        1,
        expect.stringMatching(/^\$2[ab]\$/),
      );
      expect(result).toEqual({ message: 'Contraseña actualizada con éxito' });
    });

    it('debería lanzar BadRequestException si el código es incorrecto', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({
        ...mockUser,
        resetPasswordCode: '123456',
        resetPasswordExpires: validFutureDate,
      });

      await expect(
        service.resetPassword('test@ecowatt.com', '999999', 'nuevaPassword123'),
      ).rejects.toThrow(new BadRequestException('El código es incorrecto o ha caducado.'));

      expect(mockUsersService.updatePassword).not.toHaveBeenCalled();
    });

    it('debería lanzar BadRequestException si el código ha caducado', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({
        ...mockUser,
        resetPasswordCode: '123456',
        resetPasswordExpires: expiredDate,
      });

      await expect(
        service.resetPassword('test@ecowatt.com', '123456', 'nuevaPassword123'),
      ).rejects.toThrow(new BadRequestException('El código es incorrecto o ha caducado.'));
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);

      await expect(
        service.resetPassword('noexiste@ecowatt.com', '123456', 'nuevaPassword'),
      ).rejects.toThrow(new NotFoundException('Usuario no encontrado'));
    });
  });
});