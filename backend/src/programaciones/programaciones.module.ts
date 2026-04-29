import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramacionesService } from './programaciones.service';
import { ProgramacionesController } from './programaciones.controller';
import { Programacion } from './entities/programacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Programacion])],
  controllers: [ProgramacionesController],
  providers: [ProgramacionesService],
  exports: [ProgramacionesService],
})
export class ProgramacionesModule {}