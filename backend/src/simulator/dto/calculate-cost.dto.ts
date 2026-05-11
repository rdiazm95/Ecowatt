// simulator/dto/calculate-cost.dto.ts
import { IsNumber, IsOptional, Min, Max } from 'class-validator';



export class CalculateCostDto {
  @IsNumber({}, { message: 'deviceId debe ser un número entero' })
  @Min(1, { message: 'deviceId debe ser un ID válido' })
  deviceId: number;

  // ✅ FIX: maxDecimalPlaces 2→4 para soportar minutos como 1:05 = 1.0833
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'startHour debe ser un número decimal (ej: 1.0833)' })
  @Min(0, { message: 'startHour no puede ser negativo' })
  @Max(23.99, { message: 'startHour no puede superar las 23:59' })
  startHour: number;

  // ✅ FIX: maxDecimalPlaces 2→4 para duraciones en minutos (ej: 0.0833 = 5 min)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'duracion debe ser un número decimal' })
  @Min(0.0083, { message: 'La duración debe ser mayor que 0' })
  @Max(99.9999, { message: 'La duración no puede superar 99.99 horas' })
  duracion?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'potencia debe ser un número decimal' })
  @Min(0, { message: 'La potencia no puede ser negativa' })
  @Max(999.99, { message: 'La potencia no puede superar 999.99 W' })
  potencia?: number;

  // Hora fin real, puede ser > 24 si cruza medianoche (ej: 25.0833 = 01:05 día siguiente)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'horaFin debe ser un número decimal' })
  @Min(0, { message: 'horaFin no puede ser negativa' })
  @Max(47.99, { message: 'horaFin no puede superar las 23:59 del día siguiente' })
  horaFin?: number;
}