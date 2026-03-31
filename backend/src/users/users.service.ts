import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Busca un usuario por su email (lo usaremos para el Login)
  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // Guarda un nuevo usuario en la base de datos
  async create(email: string, passwordHash: string): Promise<User> {
    const newUser = this.usersRepository.create({
      email,
      passwordHash,
    });
    return this.usersRepository.save(newUser);
  }
}