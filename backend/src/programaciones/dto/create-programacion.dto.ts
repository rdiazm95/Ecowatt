// programaciones/dto/create-programacion.dto.ts
import {
  IsNumber, IsOptional, IsDateString,
  Min, Max
} from 'class-validator';

export class CreateProgramacionDto {
  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fecha?: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'horaInicio debe ser un número decimal (ej: 11.00)' })
  @Min(0, { message: 'La hora de inicio no puede ser negativa' })
  @Max(23.99, { message: 'La hora de inicio no puede superar las 23:59' })
  horaInicio: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'horaFin debe ser un número decimal (ej: 12.00)' })
  @Min(0, { message: 'La hora de fin no puede ser negativa' })
  @Max(23.99, { message: 'La hora de fin no puede superar las 23:59' })
  horaFin: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'duracionHoras debe ser un número decimal' })
  @Min(0.01, { message: 'La duración debe ser mayor que 0' })
  @Max(99.99, { message: 'La duración no puede superar 99.99 horas' })
  duracionHoras: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'potenciaW debe ser un número decimal' })
  @Min(0, { message: 'La potencia no puede ser negativa' })
  @Max(999.99, { message: 'La potencia no puede superar 999.99 W' })
  potenciaW: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  costeEstimado?: number;

  @IsNumber({}, { message: 'id_dispositivo debe ser un número entero' })
  @Min(1, { message: 'id_dispositivo debe ser un ID válido' })
  id_dispositivo: number;
}