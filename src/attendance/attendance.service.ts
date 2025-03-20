import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // Formater une date et une heure séparément
private formatDate(date: Date | null): { date: string | null, time: string | null } {
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

  // 📌 Supprimer un lieu par son ID
  async deleteLocation(locationId: string) {
    try {
      await this.prisma.location.delete({
        where: { id: locationId },
      });
      return { message: "Lieu supprimé avec succès." };
    } catch (error) {
      throw new NotFoundException("Lieu non trouvé ou déjà supprimé.");
    }
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
  

  async getUserAttendance(date?: string) {
    let filter: any = {}; 
  
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Format de date invalide. Utilisez YYYY-MM-DD.');
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
        }
      },
      omit: { 
        password: true, 
        resetPasswordToken: true,
        isResettingPassword: true,
      },
    });
  
    // 🔹 Transformation des données pour séparer date et heure sans secondes
    return users.map(user => ({
      ...user,
      attendances: user.attendances.map(attendance => ({
        clockInDate: attendance.clockIn.toISOString().split('T')[0], // YYYY-MM-DD
        clockInTime: attendance.clockIn.toISOString().split('T')[1].slice(0, 5), // HH:MM
        clockOutDate: attendance.clockOut ? attendance.clockOut.toISOString().split('T')[0] : null, 
        clockOutTime: attendance.clockOut ? attendance.clockOut.toISOString().split('T')[1].slice(0, 5) : null, // HH:MM
      })),
    }));
  }
  
  // 📌 Supprimer l'historique des pointages d'un utilisateur
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
  
    if (!lastAttendance) {
      throw new NotFoundException("Aucun pointage trouvé.");
    }
  
    const formattedClockIn = this.formatDate(lastAttendance.clockIn);
    const formattedClockOut = this.formatDate(lastAttendance.clockOut);
  
    return {
      id: lastAttendance.id,
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