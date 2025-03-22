import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { promises as fs } from 'fs';
import path from 'path';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}
  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    return users;
  }

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
      },
    });
    console.log('🔍 Résultat trouvé :', user);
    return user;
  }

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

  // 📌 Met à jour la photo de l'utilisateur
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
}
