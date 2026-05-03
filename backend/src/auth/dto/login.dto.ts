import { IsEmail, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(150, { message: 'El email no puede superar 150 caracteres' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía' })
  @MaxLength(255)
  password: string;
}