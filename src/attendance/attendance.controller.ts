import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('attendance')
@UseGuards(JwtAuthGuard) // Protéger les routes avec JWT
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Pointer l'arrivée
  @Post('clock-in')
  @UseGuards(JwtAuthGuard)
  async clockIn(@Request() req, @Body() { location }: { location: string }) {
  console.log('Utilisateur authentifié :', req.user);
  return this.attendanceService.clockIn(req.user.userId, location);
}

  // Pointer le départ
  @Post('clock-out')
  async clockOut(@Request() req) {
    return this.attendanceService.clockOut(req.user.userId);
  }

  // Récupérer l'historique des pointages
  @Get('history')
  async getUserAttendance(@Request() req) {
    return this.attendanceService.getUserAttendance(req.user.userId);
  }
}
