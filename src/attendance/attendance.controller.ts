import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  Get,
  Delete,
  Req,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

/**
 * Contrôleur de gestion des pointages
 * Gère les routes API liées aux pointages et aux lieux:
 * - Endpoints pour les pointages (arrivée/départ)
 * - Endpoints pour la gestion des lieux
 * - Endpoints pour l'historique des pointages
 * Utilise les guards pour protéger les routes et vérifier les rôles
 */
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Endpoint pour enregistrer un pointage d'arrivée
   * Route: POST /attendance/clock-in
   * @param req - Requête contenant les informations de l'utilisateur authentifié
   * @param location - Coordonnées GPS de l'utilisateur
   * @returns Informations sur le pointage créé
   * @requires Authentication
   */
  @UseGuards(JwtAuthGuard)
  @Post('clock-in')
  async clockIn(
    @Request() req,
    @Body() { latitude, longitude }: { latitude: number; longitude: number },
  ) {
    return this.attendanceService.clockIn(req.user.userId, latitude, longitude);
  }

  /**
   * Endpoint pour enregistrer un pointage de départ
   * Route: POST /attendance/clock-out
   * @param req - Requête contenant les informations de l'utilisateur authentifié
   * @param location - Coordonnées GPS de l'utilisateur
   * @returns Informations sur le pointage mis à jour
   * @requires Authentication
   */
  @UseGuards(JwtAuthGuard)
  @Post('clock-out')
  async clockOut(
    @Request() req,
    @Body() { latitude, longitude }: { latitude: number; longitude: number },
  ) {
    return this.attendanceService.clockOut(
      req.user.userId,
      latitude,
      longitude,
    );
  }

  /**
   * Endpoint pour récupérer l'historique des pointages
   * Route: GET /attendance/history
   * @param date - Date optionnelle pour filtrer les pointages (format: YYYY-MM-DD)
   * @returns Liste des utilisateurs avec leurs pointages
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('history')
  async getUserAttendance(@Query('date') date?: string) {
    return this.attendanceService.getUserAttendance(date);
  }

  /**
   * Endpoint pour supprimer l'historique des pointages d'un utilisateur
   * Route: DELETE /attendance/history
   * @param userId - ID de l'utilisateur
   * @returns Message de confirmation
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('history')
  async clearHistory(@Query('userId') userId?: string) {
    if (!userId) {
      throw new Error(
        "L'ID de l'utilisateur est requis pour supprimer son historique.",
      );
    }
    return this.attendanceService.clearUserHistory(userId);
  }

  /**
   * Endpoint pour supprimer tout l'historique des pointages
   * Route: DELETE /attendance/history/all
   * @returns Message de confirmation
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('history/all')
  async clearAllHistory() {
    return this.attendanceService.clearAllHistory();
  }

  /**
   * Endpoint pour créer un nouveau lieu de pointage
   * Route: POST /attendance/location
   * @param data - Informations du lieu (nom, coordonnées, rayon)
   * @returns Lieu créé
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('location')
  async createLocation(
    @Body()
    data: {
      name: string;
      latitude: number;
      longitude: number;
      radius: number;
    },
  ) {
    return this.attendanceService.createLocation(
      data.name,
      data.latitude,
      data.longitude,
      data.radius,
    );
  }

  /**
   * Endpoint pour récupérer la liste des lieux de pointage
   * Route: GET /attendance/locations
   * @returns Liste des lieux
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('locations')
  async getLocations() {
    return this.attendanceService.getLocations();
  }

  /**
   * Endpoint pour supprimer un lieu de pointage
   * Route: DELETE /attendance/locations/:locationId
   * @param locationId - ID du lieu à supprimer
   * @returns Message de confirmation
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('locations/:locationId')
  async deleteLocation(@Param('locationId') locationId: string) {
    return this.attendanceService.deleteLocation(locationId);
  }

  /**
   * Endpoint pour modifier un lieu de pointage
   * Route: PATCH /attendance/locations/:locationId
   * @param locationId - ID du lieu à modifier
   * @param data - Nouvelles informations du lieu
   * @returns Message de confirmation et lieu mis à jour
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('locations/:locationId')
  async updateLocation(
    @Param('locationId') locationId: string,
    @Body()
    data: {
      name?: string;
      latitude?: number;
      longitude?: number;
      radius?: number;
    },
  ) {
    return this.attendanceService.updateLocation(locationId, data);
  }

  /**
   * Endpoint pour récupérer le dernier pointage d'un utilisateur
   * Route: GET /attendance/last
   * @param req - Requête contenant les informations de l'utilisateur authentifié
   * @returns Informations sur le dernier pointage
   * @requires Authentication
   */
  @UseGuards(JwtAuthGuard)
  @Get('last')
  async getLastAttendance(@Request() req) {
    console.log('📥 Demande de dernier pointage pour user:', req.user);
    return this.attendanceService.getLastAttendance(req.user.userId);
  }

  /**
   * Endpoint pour récupérer le nombre de pointages d'aujourd'hui
   * Route: GET /attendance/today-count
   * @returns Nombre total de pointages effectués aujourd'hui
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('today-count')
  async getTodayAttendanceCount() {
    return this.attendanceService.getTodayAttendanceCount();
  }

  /**
   * Endpoint pour récupérer les derniers pointages
   * Route: GET /attendance/recent
   * @param limit - Nombre de pointages à récupérer (optionnel, par défaut 5)
   * @returns Liste des derniers pointages avec détails
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('recent')
  async getRecentAttendances(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.attendanceService.getRecentAttendances(limitNum);
  }

  /**
   * Endpoint pour récupérer les pointages d'aujourd'hui avec détails utilisateurs
   * Route: GET /attendance/today-details
   * @returns Liste des pointages d'aujourd'hui avec informations complètes des utilisateurs
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('today-details')
  async getTodayAttendancesWithUserDetails() {
    return this.attendanceService.getTodayAttendancesWithUserDetails();
  }

  /**
   * Endpoint pour récupérer les statistiques de pointage de la dernière semaine
   * Route: GET /attendance/weekly-stats
   * @returns Statistiques de pointage pour les 7 derniers jours (format adapté aux graphiques)
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('weekly-stats')
  async getWeeklyAttendanceStats() {
    return this.attendanceService.getWeeklyAttendanceStats();
  }
}
