import { Controller, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateAlertSettingsDto } from './dto/update-alert-settings.dto';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}


  // Endpoint para guardar la configuración de la alerta desde la App
  @UseGuards(AuthGuard('jwt'))
  @Patch('alert-settings')
  async updateAlertSettings(
    @Request() req,
    @Body() body: UpdateAlertSettingsDto,
  ) {
    // El ID se extrae de forma segura del token del usuario logueado
    const userId = req.user.id;


    const updatedUser = await this.usersService.updateAlertSettings(
      userId,
      body.alertaActiva,
      body.precioObjetivo,
      body.pushToken,
    );


    // Quitamos la contraseña antes de devolver los datos al frontend
    const { passwordHash, ...result } = updatedUser;
    return result;
  }
}