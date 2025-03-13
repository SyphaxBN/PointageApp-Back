import { Controller, Post, Body, Request, UseGuards, Get, Delete, Req, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

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

  // 📌 Récupérer l'historique des pointages avec un filtre par date (réservé aux Admins)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('history')
  async getUserAttendance(@Query('date') date?: string) {
    return this.attendanceService.getUserAttendance(date);
  }

  // 📌 Supprimer l'historique des pointages d'un utilisateur (réservé aux Admins)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('history')
  async clearHistory(@Query('userId') userId?: string) {
    if (!userId) {
      throw new Error("L'ID de l'utilisateur est requis pour supprimer son historique.");
    }
    return this.attendanceService.clearUserHistory(userId);
  }

  // 📌 Supprimer tout l'historique des pointages (Nouveau)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('history/all')
  async clearAllHistory() {
    return this.attendanceService.clearAllHistory();
  }


  // 📌 Ajouter des lieux autorisés pour pointer par l'Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN') 
  @Post('location')
  async createLocation(@Body() data: { name: string; latitude: number; longitude: number; radius: number }) {
   return this.attendanceService.createLocation(data.name, data.latitude, data.longitude, data.radius);
  }

  // 📌 Récupérer la liste des lieux autorisés pour pointer par l'Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN') 
  @Get('locations')
  async getLocations() {
    return this.attendanceService.getLocations();
  }
}