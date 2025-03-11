import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // Formater une date
  private formatDate(date: Date | null): string | null {
    if (!date) return null;
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  // 📌 Ajouter des lieux
  async createLocation(name: string, latitude: number, longitude: number, radius: number) {
    return this.prisma.location.create({
      data: { name, latitude, longitude, radius },
    });
  }

  // 📌 Récupérer la liste des lieux
  async getLocations() {
    return this.prisma.location.findMany();
  }

  // Calculer la distance entre deux points GPS (Haversine)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  // Vérifier si une position est valide pour pointer
  private async isValidLocation(latitude: number, longitude: number): Promise<{ id: string; name: string } | null> {
    const locations = await this.prisma.location.findMany();

    for (const location of locations) {
      const distance = this.calculateDistance(latitude, longitude, location.latitude, location.longitude);
      if (distance <= location.radius) {
        return { id: location.id, name: location.name };
      }
    }

    return null;
  }

  // Pointer l'arrivée
  async clockIn(userId: string, latitude: number, longitude: number): Promise<any> {
    const lastAttendance = await this.prisma.attendance.findFirst({
      where: { userId, clockOut: null },
    });

    if (lastAttendance) {
      throw new BadRequestException('Vous avez déjà pointé une arrivée sans enregistrer un départ.');
    }

    const validLocation = await this.isValidLocation(latitude, longitude);
    if (!validLocation) {
      throw new BadRequestException("Vous êtes trop loin d'un lieu autorisé pour pointer.");
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        userId,
        clockIn: new Date(),
        latitude,
        longitude,
        locationId: validLocation.id, // Stocker l'ID du lieu au lieu du nom
      },
      include: { location: true },
    });

    return {
      id: attendance.id,
      userId: attendance.userId,
      clockIn: this.formatDate(attendance.clockIn),
      location: attendance.location?.name || 'Hors zone',
      latitude: attendance.latitude,
      longitude: attendance.longitude,
    };
  }

  // Pointer le départ
  async clockOut(userId: string, latitude: number, longitude: number): Promise<any> {
    const attendance = await this.prisma.attendance.findFirst({
      where: { userId, clockOut: null },
    });

    if (!attendance) {
      throw new NotFoundException("Aucune arrivée enregistrée, vous ne pouvez pas pointer votre départ.");
    }

    const validLocation = await this.isValidLocation(latitude, longitude);
    if (!validLocation) {
      throw new BadRequestException("Vous êtes trop loin d'un lieu autorisé pour pointer votre départ.");
    }

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: { clockOut: new Date(), latitude, longitude },
      include: { location: true },
    });

    return {
      id: updatedAttendance.id,
      userId: updatedAttendance.userId,
      clockIn: this.formatDate(updatedAttendance.clockIn),
      clockOut: this.formatDate(updatedAttendance.clockOut),
      location: updatedAttendance.location?.name || 'Hors zone',
      latitude: updatedAttendance.latitude,
      longitude: updatedAttendance.longitude,
    };
  }

  // Récupérer l'historique des pointages d'un utilisateur
  async getUserAttendance(userId: string) {
    return this.prisma.attendance
      .findMany({
        where: { userId },
        orderBy: { clockIn: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          location: { select: { name: true } },
        },
      })
      .then((attendances) =>
        attendances.map((a) => ({
          id: a.id,
          name: a.user?.name ?? 'Employé inconnu',
          email: a.user?.email ?? 'Email inconnu',
          clockIn: a.clockIn ? this.formatDate(a.clockIn) : 'Heure inconnue',
          clockOut: a.clockOut ? this.formatDate(a.clockOut) : 'Non renseigné',
          location: a.location?.name ?? 'Hors zone',
          latitude: a.latitude,
          longitude: a.longitude,
          createdAt: a.createdAt ? this.formatDate(a.createdAt) : 'Date inconnue',
        }))
      );
  } 
  
  async clearUserHistory(userId: string): Promise<{ message: string }> {
    await this.prisma.attendance.deleteMany({
      where: { userId },
    });
    return { message: 'Historique supprimé avec succès' };
  }
}