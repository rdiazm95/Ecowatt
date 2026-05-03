import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(150, { message: 'El email no puede superar 150 caracteres' })
  email: string;
}