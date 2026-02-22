import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricesService } from './prices.service';
import { PricesController } from './prices.controller';
import { Price } from './entities/price.entity';
import { EsiosService } from '../esios/esios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Price])],
  controllers: [PricesController],
  providers: [PricesService, EsiosService],
  exports: [PricesService],
})
export class PricesModule {}
