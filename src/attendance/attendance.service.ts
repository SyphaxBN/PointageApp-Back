import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Service de gestion des présences (pointages)
 * Gère l'ensemble des opérations liées aux pointages et aux lieux de pointage:
 * - Pointage d'arrivée/départ
 * - Gestion des lieux autorisés
 * - Historique des pointages
 */
@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {} // Injection du service Prisma

  /**
   * Formate une date en séparant date et heure pour l'affichage
   * @param date - Date à formater
   * @returns Objet contenant la date et l'heure formatées
   */
  private formatDate(date: Date | null): {
    date: string | null;
    time: string | null;
  } {
    if (!date) return { date: null, time: null };

    return {
      date: date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }

  /**
   * Crée un nouveau lieu de pointage
   * @param name - Nom du lieu
   * @param latitude - Latitude GPS du lieu
   * @param longitude - Longitude GPS du lieu
   * @param radius - Rayon en mètres dans lequel le pointage est autorisé
   * @returns Le lieu créé
   */
  async createLocation(
    name: string,
    latitude: number,
    longitude: number,
    radius: number,
  ) {
    return this.prisma.location.create({
      data: { name, latitude, longitude, radius },
    });
  }

  /**
   * Récupère la liste de tous les lieux de pointage
   * @returns Liste des lieux de pointage
   */
  async getLocations() {
    return this.prisma.location.findMany();
  }

  /**
   * Supprime un lieu de pointage par son ID
   * @param locationId - ID du lieu à supprimer
   * @returns Message de confirmation
   */
  async deleteLocation(locationId: string) {
    try {
      await this.prisma.location.delete({
        where: { id: locationId },
      });
      return { message: 'Lieu supprimé avec succès.' };
    } catch (error) {
      throw new NotFoundException('Lieu non trouvé ou déjà supprimé.');
    }
  }

  /**
   * Met à jour les informations d'un lieu de pointage
   * @param locationId - ID du lieu à modifier
   * @param data - Nouvelles informations du lieu
   * @returns Message de confirmation et lieu mis à jour
   */
  async updateLocation(
    locationId: string,
    data: {
      name?: string;
      latitude?: number;
      longitude?: number;
      radius?: number;
    },
  ) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException('Lieu non trouvé.');
    }

    const updatedLocation = await this.prisma.location.update({
      where: { id: locationId },
      data,
    });

    return {
      message: 'Lieu mis à jour avec succès.',
      updatedLocation,
    };
  }

  /**
   * Calcule la distance en mètres entre deux points GPS (formule de Haversine)
   * @param lat1 - Latitude du premier point
   * @param lon1 - Longitude du premier point
   * @param lat2 - Latitude du deuxième point
   * @param lon2 - Longitude du deuxième point
   * @returns Distance en mètres
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity; // Éviter les erreurs si les valeurs sont nulles

    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }

  /**
   * Vérifie si une position est valide pour pointer (dans le rayon d'un lieu autorisé)
   * @param latitude - Latitude de l'utilisateur
   * @param longitude - Longitude de l'utilisateur
   * @returns Informations sur le lieu si position valide, null sinon
   */
  private async isValidLocation(
    latitude: number,
    longitude: number,
  ): Promise<{ id: string; name: string } | null> {
    const locations = await this.prisma.location.findMany();

    for (const location of locations) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
      );
      if (distance <= location.radius) {
        return { id: location.id, name: location.name };
      }
    }

    return null;
  }

  /**
   * Enregistre un pointage d'arrivée
   * @param userId - ID de l'utilisateur
   * @param latitude - Latitude de l'utilisateur
   * @param longitude - Longitude de l'utilisateur
   * @returns Informations sur le pointage créé
   */
  async clockIn(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<any> {
    const lastAttendance = await this.prisma.attendance.findFirst({
      where: { userId, clockOut: null },
    });

    const validLocation = await this.isValidLocation(latitude, longitude);
    if (!validLocation) {
      throw new BadRequestException(
        "Vous êtes trop loin d'un lieu autorisé pour pointer.",
      );
    }
    if (lastAttendance) {
      throw new BadRequestException(
        'Vous avez déjà pointé une arrivée sans enregistrer un départ.',
      );
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        userId,
        clockIn: new Date(),
        latitude,
        longitude,
        locationId: validLocation.id,
      },
      include: { location: true },
    });

    const formattedClockIn = this.formatDate(attendance.clockIn);

    return {
      id: attendance.id,
      userId: attendance.userId,
      clockInDate: formattedClockIn.date,
      clockInTime: formattedClockIn.time,
      location: attendance.location?.name || 'Hors zone',
      latitude: attendance.latitude,
      longitude: attendance.longitude,
    };
  }

  /**
   * Enregistre un pointage de départ
   * @param userId - ID de l'utilisateur
   * @param latitude - Latitude de l'utilisateur
   * @param longitude - Longitude de l'utilisateur
   * @returns Informations sur le pointage mis à jour
   */
  async clockOut(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<any> {
    const attendance = await this.prisma.attendance.findFirst({
      where: { userId, clockOut: null },
    });

    const validLocation = await this.isValidLocation(latitude, longitude);
    if (!validLocation) {
      throw new BadRequestException(
        "Vous êtes trop loin d'un lieu autorisé pour pointer.",
      );
    }
    if (!attendance) {
      throw new NotFoundException(
        'Aucune arrivée enregistrée, vous ne pouvez pas pointer votre départ.',
      );
    }

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: { clockOut: new Date(), latitude, longitude },
      include: { location: true },
    });

    const formattedClockIn = this.formatDate(updatedAttendance.clockIn);
    const formattedClockOut = this.formatDate(updatedAttendance.clockOut);

    return {
      id: updatedAttendance.id,
      userId: updatedAttendance.userId,
      clockInDate: formattedClockIn.date,
      clockInTime: formattedClockIn.time,
      clockOutDate: formattedClockOut.date,
      clockOutTime: formattedClockOut.time,
      location: updatedAttendance.location?.name || 'Hors zone',
      latitude: updatedAttendance.latitude,
      longitude: updatedAttendance.longitude,
    };
  }

  /**
   * Récupère l'historique des pointages de tous les utilisateurs
   * @param date - Date optionnelle pour filtrer les pointages
   * @returns Liste des utilisateurs avec leurs pointages
   */
  async getUserAttendance(date?: string) {
    let filter: any = {};

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException(
          'Format de date invalide. Utilisez YYYY-MM-DD.',
        );
      }

      const parsedDate = new Date(date + 'T00:00:00.000Z');
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestException('Date non valide.');
      }

      const startOfDay = new Date(parsedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(parsedDate);
      endOfDay.setHours(23, 59, 59, 999);

      filter.clockIn = { gte: startOfDay, lte: endOfDay };
    }

    const users = await this.prisma.user.findMany({
      include: {
        attendances: {
          where: filter,
          orderBy: { clockIn: 'desc' },
        },
      },
      omit: {
        password: true,
        resetPasswordToken: true,
        isResettingPassword: true,
      },
    });

    // 🔹 Transformation des données pour séparer date et heure sans secondes
    return users.map((user) => ({
      ...user,
      attendances: user.attendances.map((attendance) => ({
        clockInDate: attendance.clockIn.toISOString().split('T')[0], // YYYY-MM-DD
        clockInTime: attendance.clockIn.toISOString().split('T')[1].slice(0, 5), // HH:MM
        clockOutDate: attendance.clockOut
          ? attendance.clockOut.toISOString().split('T')[0]
          : null,
        clockOutTime: attendance.clockOut
          ? attendance.clockOut.toISOString().split('T')[1].slice(0, 5)
          : null, // HH:MM
      })),
    }));
  }

  /**
   * Supprime l'historique des pointages d'un utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Message de confirmation
   */
  async clearUserHistory(userId: string) {
    // Vérifie que l'utilisateur existe avant de supprimer son historique
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!userExists) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    // Supprime tous les pointages de cet utilisateur
    await this.prisma.attendance.deleteMany({
      where: { userId },
    });

    return {
      message:
        "L'historique des pointages de l'utilisateur a été supprimé avec succès.",
    };
  }

  /**
   * Supprime tout l'historique des pointages de tous les utilisateurs
   * @returns Message de confirmation
   */
  async clearAllHistory() {
    await this.prisma.attendance.deleteMany({});
    return { message: 'Tous les pointages ont été supprimés avec succès.' };
  }

  /**
   * Récupère le dernier pointage d'un utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Informations sur le dernier pointage
   */
  async getLastAttendance(userId: string) {
    console.log('🔎 Recherche du dernier pointage pour userId:', userId);

    const lastAttendance = await this.prisma.attendance.findFirst({
      where: { userId }, // 🔥 Vérifie que userId est bien utilisé ici !
      orderBy: { clockIn: 'desc' },
      include: { location: true },
    });

    if (!lastAttendance) {
      throw new NotFoundException('Aucun pointage trouvé.');
    }

    console.log('✅ Dernier pointage trouvé:', lastAttendance);

    const formattedClockIn = this.formatDate(lastAttendance.clockIn);
    const formattedClockOut = this.formatDate(lastAttendance.clockOut);

    return {
      id: lastAttendance.id,
      userId: lastAttendance.userId,
      clockInDate: formattedClockIn.date,
      clockInTime: formattedClockIn.time,
      clockOutDate: formattedClockOut.date,
      clockOutTime: formattedClockOut.time,
      location: lastAttendance.location?.name || 'Hors zone',
      latitude: lastAttendance.latitude,
      longitude: lastAttendance.longitude,
    };
  }
}
