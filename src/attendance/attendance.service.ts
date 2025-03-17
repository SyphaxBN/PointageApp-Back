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

  // 📌 Récupérer l'historique des pointages (tous les employés, avec un filtre par date)
  async getUserAttendance(date?: string) {
    let filter: any = {}; 
  
    if (date) {
      // Vérifie si la date est bien au format YYYY-MM-DD avant conversion
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Format de date invalide. Utilisez YYYY-MM-DD.');
      }
  
      const parsedDate = new Date(date + 'T00:00:00.000Z'); // Assurer une conversion UTC propre
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestException('Date non valide.');
      }
  
      // Définir le début et la fin de la journée
      const startOfDay = new Date(parsedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(parsedDate);
      endOfDay.setHours(23, 59, 59, 999);
  
      filter.clockIn = { gte: startOfDay, lte: endOfDay };
    }
  
    return this.prisma.user.findMany
    ({
      include: { 
        attendances: {
        where: filter,
        orderBy: { clockIn: 'desc' },
      } },
      omit: { 
        password: true, 
        resetPasswordToken: true,
        isResettingPassword: true,
      },
    });

  }

  async clearUserHistory(userId: string) {
    // Vérifie que l'utilisateur existe avant de supprimer son historique
    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      throw new NotFoundException("Utilisateur introuvable.");
    }
  
    // Supprime tous les pointages de cet utilisateur
    await this.prisma.attendance.deleteMany({
      where: { userId },
    });
  
    return { message: "L'historique des pointages de l'utilisateur a été supprimé avec succès." };
  }

  // 📌 Supprimer tout l'historique des pointages
  async clearAllHistory() {
    await this.prisma.attendance.deleteMany({});
    return { message: "Tous les pointages ont été supprimés avec succès." };
 }

  // 📌 Récupérer le dernier pointage de l'utilisateur connecté
  async getLastAttendance(userId: string) {
    const lastAttendance = await this.prisma.attendance.findFirst({
      where: { userId },
      orderBy: { clockIn: 'desc' },
      include: { location: true },
    });
  
    console.log("🔵 lastAttendance depuis DB:", lastAttendance); // Debug
  
    if (!lastAttendance) {
      console.log("⚠️ Aucun pointage trouvé pour userId:", userId);
      throw new NotFoundException("Aucun pointage trouvé.");
    }
  
    return {
      id: lastAttendance.id,
      clockIn: this.formatDate(lastAttendance.clockIn),
      clockOut: this.formatDate(lastAttendance.clockOut),
      location: lastAttendance.location?.name || 'Hors zone',
      latitude: lastAttendance.latitude,
      longitude: lastAttendance.longitude,
    };
  }
  

}