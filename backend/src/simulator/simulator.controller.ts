import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt')) // Protegemos el simulador
@Controller('simulator')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post('calculate')
  calculate(@Body() body: { deviceId: number; startHour: number }, @Request() req) {
    const userId = req.user.id;
    return this.simulatorService.calculateCost(userId, body.deviceId, body.startHour);
  }
}