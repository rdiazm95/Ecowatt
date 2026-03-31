import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt')) // ¡CERRADURA PARA TODAS LAS RUTAS DE ESTE ARCHIVO!
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  // Endpoint para guardar un nuevo electrodoméstico
  @Post()
  create(@Body() createDeviceDto: any, @Request() req) {
    // Extraemos el ID del usuario directamente del Token JWT (super seguro)
    const userId = req.user.id;
    return this.devicesService.create(createDeviceDto, userId);
  }

  // Endpoint para ver la lista de mis electrodomésticos
  @Get()
  findAll(@Request() req) {
    const userId = req.user.id;
    return this.devicesService.findAllByUserId(userId);
  }

  // Endpoint para borrar un electrodoméstico
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    // El '+' delante de id lo convierte de String a Number
    return this.devicesService.remove(+id, userId);
  }
}