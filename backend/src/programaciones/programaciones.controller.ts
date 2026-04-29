import {
  Controller, Get, Post, Delete,
  Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProgramacionesService } from './programaciones.service';

@UseGuards(AuthGuard('jwt'))
@Controller('programaciones')
export class ProgramacionesController {
  constructor(private readonly service: ProgramacionesService) {}

  @Post()
  crear(@Request() req, @Body() dto: any) {
    return this.service.crear(req.user.id, dto);
  }

  @Get()
  getMias(@Request() req) {
    return this.service.findByUsuario(req.user.id);
  }

  @Delete(':id')
  eliminar(@Request() req, @Param('id') id: string) {
    return this.service.eliminar(+id, req.user.id);
  }
}