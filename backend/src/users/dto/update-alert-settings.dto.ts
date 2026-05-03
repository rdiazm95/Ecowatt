// users/dto/update-alert-settings.dto.ts
import { IsBoolean, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class UpdateAlertSettingsDto {
  @IsBoolean({ message: 'alertaActiva debe ser true o false' })
  alertaActiva: boolean;

  @IsNumber({}, { message: 'precioObjetivo debe ser un número' })
  @Min(0, { message: 'El precio objetivo no puede ser negativo' })
  precioObjetivo: number;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'El pushToken no puede superar 255 caracteres' })
  pushToken?: string;
}