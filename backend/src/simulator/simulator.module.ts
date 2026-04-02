import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { SimulatorController } from './simulator.controller';
import { DevicesModule } from '../devices/devices.module'; // Importamos dispositivos
import { PricesModule } from '../prices/prices.module';   // Importamos precios

@Module({
  imports: [DevicesModule, PricesModule], // <-- Los añadimos aquí
  controllers: [SimulatorController],
  providers: [SimulatorService]
})
export class SimulatorModule {}