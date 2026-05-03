import { IsString, IsNumber, IsNotEmpty, Min, Max, MaxLength } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del dispositivo es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El tipo del dispositivo es obligatorio' })
  @MaxLength(50, { message: 'El tipo no puede superar 50 caracteres' })
  tipo: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La potencia debe ser un número con máximo 2 decimales' })
  @Min(0, { message: 'La potencia no puede ser negativa' })
  @Max(999.99, { message: 'La potencia no puede superar 999.99 kW' })
  potencia: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La duración debe ser un número con máximo 2 decimales' })
  @Min(0, { message: 'La duración no puede ser negativa' })
  @Max(999.99, { message: 'La duración no puede superar 999.99 horas' })
  duracion: number;
}