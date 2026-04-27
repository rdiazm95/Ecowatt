import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricesService } from './prices.service';
import { PricesController } from './prices.controller';
import { Price } from './entities/price.entity';
import { EsiosService } from '../esios/esios.service';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module'; // <-- NUEVO IMPORT

@Module({
  imports: [
    TypeOrmModule.forFeature([Price]), 
    UsersModule, 
    NotificationsModule, // <-- AÑADIDO AQUÍ
  ],
  controllers: [PricesController],
  providers: [PricesService, EsiosService],
  exports: [PricesService],
})
export class PricesModule {}