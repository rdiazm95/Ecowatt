// simulator/dto/calculate-cost.dto.ts
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CalculateCostDto {
  @IsNumber({}, { message: 'deviceId debe ser un número entero' })
  @Min(1, { message: 'deviceId debe ser un ID válido' })
  deviceId: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'startHour debe ser un número decimal (ej: 11.08)' })
  @Min(0, { message: 'startHour no puede ser negativo' })
  @Max(23.99, { message: 'startHour no puede superar las 23:59' })
  startHour: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'duracion debe ser un número decimal' })
  @Min(0.01, { message: 'La duración debe ser mayor que 0' })
  @Max(99.99, { message: 'La duración no puede superar 99.99 horas' })
  duracion?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'potencia debe ser un número decimal' })
  @Min(0, { message: 'La potencia no puede ser negativa' })
  @Max(999.99, { message: 'La potencia no puede superar 999.99 W' })
  potencia?: number;
}