import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Exportez l'interface pour qu'elle soit accessible depuis d'autres fichiers
export interface DayData {
  date: string;
  total: number;
  completed: number;
  inProgress: number;
}

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
   * @throws BadRequestException si un lieu avec le même nom existe déjà
   */
  async createLocation(
    name: string,
    latitude: number,
    longitude: number,
    radius: number,
  ) {
    // Vérifier si un lieu avec le même nom existe déjà
    const existingLocation = await this.prisma.location.findUnique({
      where: { name }
    });

    // Si un lieu avec ce nom existe déjà, renvoyer une erreur
    if (existingLocation) {
      throw new BadRequestException(`Un lieu nommé "${name}" existe déjà.`);
    }

    // Si le nom est unique, créer le nouveau lieu
    return this.prisma.location.create({
      data: { name, latitude, longitude, radius },
    });
  }

  /**
   * Récupère la liste de tous les lieux de pointage avec statistiques
   * @returns Liste des lieux de pointage avec le nombre de pointages pour chacun
   */
  async getLocations() {
    // Récupère tous les lieux avec des informations détaillées
    const locations = await this.prisma.location.findMany({
      include: {
        // Inclure la relation avec les pointages pour pouvoir les compter
        attendances: true,
      }
    });

    // Transforme les données pour inclure les statistiques de pointage
    return locations.map(location => {
      // Formate la date de création pour l'affichage
      const createdAtFormatted = new Date(location.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Prépare l'objet de réponse avec toutes les informations nécessaires
      return {
        id: location.id,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius,
        dateAjout: createdAtFormatted,
        // Compte le nombre total de pointages pour ce lieu
        stats: {
          totalPointages: location.attendances.length,
          label: 'pointages'
        }
      };
    });
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
   * @throws NotFoundException si le lieu n'existe pas
   * @throws BadRequestException si le nouveau nom existe déjà pour un autre lieu
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
    // Vérifie si le lieu à modifier existe
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException('Lieu non trouvé.');
    }

    // Si un nouveau nom est fourni, vérifie s'il existe déjà sur un autre lieu
    if (data.name && data.name !== location.name) {
      const existingLocationWithSameName = await this.prisma.location.findFirst({
        where: {
          name: data.name,
          id: { not: locationId } // Exclut le lieu en cours de modification
        },
      });

      if (existingLocationWithSameName) {
        throw new BadRequestException(`Un lieu nommé "${data.name}" existe déjà.`);
      }
    }

    // Si le nom est unique ou inchangé, procède à la mise à jour
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
          include: {
            location: true, // Inclure les informations du lieu
          },
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
        id: attendance.id,
        clockInDate: attendance.clockIn.toISOString().split('T')[0], // YYYY-MM-DD
        clockInTime: attendance.clockIn.toISOString().split('T')[1].slice(0, 5), // HH:MM
        clockOutDate: attendance.clockOut
          ? attendance.clockOut.toISOString().split('T')[0]
          : null,
        clockOutTime: attendance.clockOut
          ? attendance.clockOut.toISOString().split('T')[1].slice(0, 5)
          : null, // HH:MM
        location: attendance.location?.name || 'Hors zone', // Ajout du nom du lieu
        coordinates: { // Coordonnées GPS du pointage
          latitude: attendance.latitude,
          longitude: attendance.longitude,
        },
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

  /**
   * Récupère le nombre total de pointages pour aujourd'hui
   * @returns Nombre total de pointages effectués aujourd'hui
   */
  async getTodayAttendanceCount() {
    try {
      // Création des limites pour aujourd'hui
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Récupération des pointages pour aujourd'hui en une seule requête
      const todayAttendances = await this.prisma.attendance.findMany({
        where: {
          clockIn: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          id: true,
          clockOut: true,
        },
      });

      // Calcul des statistiques à partir des données récupérées
      const totalCount = todayAttendances.length;
      const completedCount = todayAttendances.filter(a => a.clockOut !== null).length;
      const inProgressCount = totalCount - completedCount;

      return {
        total: totalCount,
        label: 'Pointages aujourd\'hui',
        details: {
          completed: {
            count: completedCount,
            label: 'Pointages terminés',
          },
          inProgress: {
            count: inProgressCount,
            label: 'Pointages en cours',
          }
        }
      };
    } catch (error) {
      console.error('Erreur lors du comptage des pointages:', error);
      throw new InternalServerErrorException('Erreur lors du comptage des pointages');
    }
  }

  /**
   * Récupère les derniers pointages avec des informations détaillées
   * @param limit - Nombre de pointages à récupérer (par défaut 5)
   * @returns Liste des derniers pointages avec nom d'utilisateur, lieu et horodatage
   */
  async getRecentAttendances(limit: number = 5) {
    try {
      // Récupère les derniers pointages avec les relations utilisateur et lieu
      const recentAttendances = await this.prisma.attendance.findMany({
        take: limit,
        orderBy: {
          clockIn: 'desc'
        },
        include: {
          user: {
            select: {
              name: true,
              photo: true
            }
          },
          location: true
        }
      });

      // Transforme les données pour un format plus adapté à l'affichage
      return {
        attendances: recentAttendances.map(attendance => ({
          id: attendance.id,
          userName: attendance.user.name,
          userPhoto: attendance.user.photo,
          location: attendance.location?.name || 'Hors zone',
          // Formate les dates pour l'affichage
          clockIn: this.formatDate(attendance.clockIn),
          clockOut: this.formatDate(attendance.clockOut),
          // Indique si le pointage est terminé (avec départ) ou en cours
          status: attendance.clockOut ? 'Terminé' : 'En cours',
          // Calcule la durée si le pointage est terminé
          duration: attendance.clockOut 
            ? this.calculateDuration(attendance.clockIn, attendance.clockOut)
            : null
        }))
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des derniers pointages:', error);
      throw new InternalServerErrorException('Erreur lors de la récupération des derniers pointages');
    }
  }

  /**
   * Calcule la durée entre deux dates et la formate en heures et minutes
   * @param start - Date de début
   * @param end - Date de fin
   * @returns Durée formatée en heures et minutes
   */
  private calculateDuration(start: Date, end: Date): string {
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}min`;
  }

  /**
   * Récupère les pointages d'aujourd'hui avec toutes les informations des utilisateurs
   * @returns Liste détaillée des pointages d'aujourd'hui avec infos utilisateurs
   */
  async getTodayAttendancesWithUserDetails() {
    try {
      // Création des limites pour aujourd'hui
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Récupère tous les pointages d'aujourd'hui avec les détails utilisateur et lieu
      const todayAttendances = await this.prisma.attendance.findMany({
        where: {
          clockIn: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: {
          clockIn: 'desc', // Du plus récent au plus ancien
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photo: true,
              role: true,
              createdAt: true,
            }
          },
          location: true,
        }
      });

      // Transforme les données pour un format plus adapté à l'affichage
      return {
        count: todayAttendances.length,
        attendances: todayAttendances.map(attendance => ({
          id: attendance.id,
          user: {
            id: attendance.user.id,
            name: attendance.user.name,
            email: attendance.user.email,
            photo: attendance.user.photo,
            role: attendance.user.role,
            inscription: attendance.user.createdAt 
              ? new Date(attendance.user.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              : null,
          },
          location: attendance.location?.name || 'Hors zone',
          clockIn: this.formatDate(attendance.clockIn),
          clockOut: this.formatDate(attendance.clockOut),
          status: attendance.clockOut ? 'Terminé' : 'En cours',
          duration: attendance.clockOut 
            ? this.calculateDuration(attendance.clockIn, attendance.clockOut)
            : null,
          coordinates: {
            latitude: attendance.latitude,
            longitude: attendance.longitude,
          }
        }))
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des pointages du jour:', error);
      throw new InternalServerErrorException('Erreur lors de la récupération des pointages du jour');
    }
  }

  /**
   * Récupère les statistiques de pointage pour les 7 derniers jours
   * Ne compte qu'un seul pointage par utilisateur par jour
   * @returns Données structurées pour un graphique de pointages hebdomadaire
   */
  async getWeeklyAttendanceStats() {
    try {
      // Définition de la plage de dates (7 derniers jours)
      const today = new Date();
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6); // 6 jours avant aujourd'hui (total 7 jours)
      startDate.setHours(0, 0, 0, 0);

      // Récupération de tous les pointages de la semaine avec userId pour identifier les utilisateurs uniques
      const weeklyAttendances = await this.prisma.attendance.findMany({
        where: {
          clockIn: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          userId: true,
          clockIn: true,
          clockOut: true,
        }
      });

      // Préparation de la structure pour les 7 derniers jours
      const days: DayData[] = [];
      const labels: string[] = [];
      const counts: number[] = [];
      
      // Génération des données pour chaque jour de la semaine
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - i)); // Du jour le plus ancien au plus récent
        
        // Date au format ISO pour comparaison
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Format de date localisé pour l'affichage
        const formattedDate = date.toLocaleDateString('fr-FR', {
          weekday: 'short', // Lun, Mar, etc.
          day: '2-digit',
          month: '2-digit'
        });
        
        // Filtrage des pointages pour cette journée
        const dailyAttendances = weeklyAttendances.filter(attendance => {
          const clockInDate = new Date(attendance.clockIn);
          return clockInDate >= dayStart && clockInDate <= dayEnd;
        });
        
        // Extrait les utilisateurs uniques qui ont pointé ce jour-là
        const uniqueUserIds = new Set(dailyAttendances.map(a => a.userId));
        const uniqueCount = uniqueUserIds.size;
        
        // Comptage des pointages complétés et en cours (par utilisateurs uniques)
        const usersWithCompletedAttendance = new Set();
        const usersWithInProgressAttendance = new Set();
        
        dailyAttendances.forEach(attendance => {
          if (attendance.clockOut) {
            usersWithCompletedAttendance.add(attendance.userId);
          } else {
            usersWithInProgressAttendance.add(attendance.userId);
          }
        });
        
        // Si un utilisateur a un pointage terminé et un en cours, il est compté comme "ayant terminé"
        const completedUniqueCount = usersWithCompletedAttendance.size;
        const inProgressUniqueCount = uniqueCount - completedUniqueCount;
        
        // Stockage des données pour ce jour
        days.push({
          date: formattedDate,
          total: uniqueCount,
          completed: completedUniqueCount,
          inProgress: inProgressUniqueCount
        });
        
        // Préparation des données pour un format adapté aux graphiques
        labels.push(formattedDate);
        counts.push(uniqueCount);
      }

      // Calcul des statistiques globales pour la semaine (utilisateurs uniques sur toute la semaine)
      const uniqueUsersInWeek = new Set(weeklyAttendances.map(a => a.userId));
      const totalUniqueUsers = uniqueUsersInWeek.size;
      
      // Utilisateurs ayant au moins un pointage complet dans la semaine
      const usersWithCompletedAttendanceInWeek = new Set(
        weeklyAttendances
          .filter(a => a.clockOut !== null)
          .map(a => a.userId)
      );
      const completedUniqueUsersCount = usersWithCompletedAttendanceInWeek.size;
      const inProgressUniqueUsersCount = totalUniqueUsers - completedUniqueUsersCount;
      
      // Renvoie des données structurées pour un graphique
      return {
        totalWeek: totalUniqueUsers,
        summary: {
          completed: completedUniqueUsersCount,
          inProgress: inProgressUniqueUsersCount
        },
        dailyData: days,
        // Format adapté pour les bibliothèques de graphiques (ChartJS, etc.)
        chart: {
          labels,
          datasets: [
            {
              label: 'Utilisateurs ayant pointé',
              data: counts
            }
          ]
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques hebdomadaires:', error);
      throw new InternalServerErrorException('Erreur lors de la récupération des statistiques hebdomadaires');
    }
  }
}
