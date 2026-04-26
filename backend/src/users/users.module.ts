import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller'; // <-- 1. Importamos el controlador
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController], // <-- 2. Lo registramos aquí
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}