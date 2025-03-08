import { Controller, Post, Body, Request, UseGuards, Get } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // 📌 Pointer l'arrivée
  @UseGuards(JwtAuthGuard)
  @Post('clock-in')
  async clockIn(
    @Request() req,
    @Body() { latitude, longitude }: { latitude: number; longitude: number }
  ) {
    return this.attendanceService.clockIn(req.user.userId, latitude, longitude);
  }

  // 📌 Pointer le départ
  @UseGuards(JwtAuthGuard)
  @Post('clock-out')
  async clockOut(
    @Request() req,
    @Body() { latitude, longitude }: { latitude: number; longitude: number }
  ) {
    return this.attendanceService.clockOut(req.user.userId, latitude, longitude);
  }

  // 📌 Récupérer l'historique des pointages d'un utilisateur
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getUserAttendance(@Request() req) {
    return this.attendanceService.getUserAttendance(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('location')
  async createLocation(@Body() data: { name: string; latitude: number; longitude: number; radius: number }) {
   return this.attendanceService.createLocation(data.name, data.latitude, data.longitude, data.radius);
 }


  // 📌 Récupérer la liste des lieux autorisés pour pointer
  @UseGuards(JwtAuthGuard)
  @Get('locations')
  async getLocations() {
    return this.attendanceService.getLocations();
  }
}