import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '@nestjs-modules/mailer';

import { PricesModule } from './prices/prices.module';
import { EsiosService } from './esios/esios.service';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
import { SimulatorModule } from './simulator/simulator.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProgramacionesModule } from './programaciones/programaciones.module';

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
        synchronize: true,
        ssl: true,
        extra: {
          ssl: {
            rejectUnauthorized: false,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Configuración de Correos leída desde las variables de entorno de Render
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Convertimos el puerto a número
        const mailPort = Number(configService.get('MAIL_PORT'));
        
        return {
          transport: {
            host: configService.get('MAIL_HOST'), 
            port: mailPort,                       
            secure: mailPort === 465,             
            auth: {
              user: configService.get('MAIL_USER'),     
              pass: configService.get('MAIL_PASSWORD'), 
            },
            // Añadimos los timeouts por seguridad
            connectionTimeout: 10000, 
            greetingTimeout: 10000,
            socketTimeout: 10000,
          },
          defaults: {
            // CAMBIO AQUÍ: Ponemos tu correo original a mano para el remitente
            from: `"Soporte EcoWatt" <ecowatt.proyecto@gmail.com>`,
          },
        };
      },
      inject: [ConfigService],
    }),

    PricesModule,
    DashboardModule,
    UsersModule,
    AuthModule,
    DevicesModule,
    SimulatorModule,
    NotificationsModule,
    ProgramacionesModule,
  ],
  providers: [EsiosService],
})
export class AppModule {}