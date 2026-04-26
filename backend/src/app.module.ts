import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '@nestjs-modules/mailer'; // <-- 1. Importamos el módulo de correos

import { PricesModule } from './prices/prices.module';
import { EsiosService } from './esios/esios.service';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
import { SimulatorModule } from './simulator/simulator.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    
    // Configuración de la Base de Datos
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: +configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: true, // Magia para que cree las tablas solas
        
        // ==========================================
        // CONFIGURACIÓN OBLIGATORIA PARA LA NUBE (SSL)
        // ==========================================
        ssl: true,
        extra: {
          ssl: {
            rejectUnauthorized: false,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // ==========================================
    // NUEVO: CONFIGURACIÓN DE CORREOS (Mailer)
    // ==========================================
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST') || 'sandbox.smtp.mailtrap.io', 
          port: configService.get('MAIL_PORT') || 2525,
          auth: {
            // Sustituye estos valores temporales por tus credenciales de la web de Mailtrap
            user: configService.get('MAIL_USER') || 'c42acb183aac41',
            pass: configService.get('MAIL_PASSWORD') || 'e34886f9c39b17',
          },
        },
        defaults: {
          from: '"Soporte EcoWatt" <noreply@ecowatt.com>',
        },
      }),
      inject: [ConfigService],
    }),

    PricesModule,
    DashboardModule,
    UsersModule,
    AuthModule,
    DevicesModule,
    SimulatorModule,
  ],
  providers: [EsiosService],
})
export class AppModule {}