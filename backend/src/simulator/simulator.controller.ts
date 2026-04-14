import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('simulator')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

@Post('calculate')
calculate(
  @Request() req: any,
  @Body() body: { deviceId: number; startHour: number; duracion?: number; potencia?: number } // <-- Añadir potencia al body
) {
  const userId = req.user.id || req.user.userId;
  return this.simulatorService.calculateCost(
    userId, 
    body.deviceId, 
    body.startHour, 
    body.duracion,
    body.potencia // <-- Pasarlo aquí
  );
}
}