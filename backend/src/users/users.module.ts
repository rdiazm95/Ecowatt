import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  // 1. Importamos la entidad para que TypeORM cree la tabla
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  // 2. Exportamos el servicio para que el módulo de Auth pueda usarlo
  exports: [UsersService],
})
export class UsersModule {}