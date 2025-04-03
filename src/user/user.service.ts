import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Service de gestion des utilisateurs
 * Gère les opérations CRUD sur les utilisateurs:
 * - Récupération des utilisateurs
 * - Suppression des utilisateurs
 * - Gestion des photos de profil
 */
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {} // Injection du service Prisma

  /**
   * Récupère tous les utilisateurs (sans informations sensibles)
   * @returns Liste des utilisateurs avec leurs informations de base, leur rôle et leur date de création
   */
  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,      // Ajout du rôle de l'utilisateur
        photo: true,     // Ajout de la photo pour le tableau de bord admin
        createdAt: true, // Ajout de la date de création
      },
    });
    
    // Formater les dates de création pour une meilleure lisibilité
    return users.map(user => ({
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) : null
    }));
  }

  /**
   * Récupère un utilisateur par son ID
   * @param userId - ID de l'utilisateur
   * @returns Informations de l'utilisateur (sans mot de passe)
   */
  async getUser({ userId }: { userId: string }) {
    console.log('📌 Recherche utilisateur avec ID :', userId);
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        photo: true,
      },
    });
    console.log('🔍 Résultat trouvé :', user);
    return user;
  }

  /**
   * Supprime un utilisateur et sa photo de profil
   * @param userId - ID de l'utilisateur à supprimer
   * @returns Message de confirmation
   */
  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé.');
    }

    // 🔥 Supprimer la photo du dossier si elle existe
    if (user.photo) {
      const imagePath = `.${user.photo}`;
      try {
        await fs.access(imagePath); // Vérifie si l'image existe
        await fs.unlink(imagePath); // Supprime l'image
        console.log(`Image supprimée : ${imagePath}`);
      } catch (error) {
        console.warn(`Impossible de supprimer la photo : ${error.message}`);
      }
    }
    await this.prisma.user.delete({ where: { id: userId } });

    return { message: '✅ Utilisateur supprimé avec succès' };
  }

  /**
   * Met à jour la photo de profil d'un utilisateur
   * @param userId - ID de l'utilisateur
   * @param photoUrl - URL de la nouvelle photo
   * @returns Utilisateur mis à jour
   */
  async updatePhoto(userId: string, photoUrl: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé.');
    }

    // Supprime l'ancienne photo si elle existe
    if (user.photo) {
      try {
        await fs.unlink(`.${user.photo}`);
      } catch (error) {
        console.warn(
          "⚠ Impossible de supprimer l'ancienne photo:",
          error.message,
        );
      }
    }

    // Met à jour la photo
    return this.prisma.user.update({
      where: { id: userId },
      data: { photo: photoUrl },
    });
  }

  /**
   * Récupère les statistiques des utilisateurs (nombre total et par rôle)
   * @returns Objet contenant les statistiques des utilisateurs
   */
  async getUsersStats() {
    // Récupère le nombre total d'utilisateurs
    const totalUsers = await this.prisma.user.count();
    
    // Récupère le nombre d'administrateurs
    const totalAdmins = await this.prisma.user.count({
      where: { role: 'ADMIN' }
    });
    
    // Calcule le nombre d'utilisateurs standard (non-admin)
    const totalEmployees = totalUsers - totalAdmins;
    
    return {
      employees: {
        count: totalEmployees,
        label: 'Employés'
      },
      administrators: {
        count: totalAdmins,
        label: 'Administrateurs'
      },
      total: totalUsers
    };
  }
}
