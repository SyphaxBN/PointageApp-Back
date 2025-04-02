import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Request,
  Get,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UserService } from './user.service';
import { Express } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Contrôleur de gestion des utilisateurs
 * Gère les routes API liées aux utilisateurs:
 * - Récupération des utilisateurs (admin)
 * - Suppression des utilisateurs (admin)
 * - Gestion des photos de profil
 * Utilise les guards pour protéger les routes et vérifier les rôles
 */
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Endpoint pour récupérer tous les utilisateurs
   * Route: GET /users
   * @returns Liste des utilisateurs avec leurs informations de base
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  getUsers() {
    return this.userService.getUsers();
  }

  /**
   * Endpoint pour récupérer un utilisateur par son ID
   * Route: GET /users/:userId
   * @param userId - ID de l'utilisateur à récupérer
   * @returns Informations de l'utilisateur (sans mot de passe)
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('/:userId')
  getUser(@Param('userId') userId: string) {
    return this.userService.getUser({ userId });
  }

  /**
   * Endpoint pour supprimer un utilisateur
   * Route: DELETE /users/:userId
   * @param userId - ID de l'utilisateur à supprimer
   * @returns Message de confirmation
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('/:userId')
  deleteUser(@Param('userId') userId: string) {
    return this.userService.deleteUser(userId);
  }

  /**
   * Endpoint pour télécharger et mettre à jour la photo de profil d'un utilisateur
   * Route: POST /users/upload-photo
   * @param req - Requête contenant les informations de l'utilisateur authentifié
   * @param file - Fichier image téléchargé
   * @returns Message de confirmation et URL de l'image
   * @requires Authentication
   * @throws HttpException si aucun fichier n'est fourni ou si le format n'est pas supporté
   */
  @UseGuards(JwtAuthGuard)
  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // Configuration du stockage des fichiers
        destination: './uploads', // Dossier de destination pour les fichiers téléchargés
        filename: (_req, file, cb) => {
          // Génération d'un nom de fichier unique pour éviter les conflits
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `profile-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // Limite de taille à 2MB pour éviter les fichiers trop volumineux
      fileFilter: (_req, file, cb) => {
        // Filtrage des types de fichiers autorisés (sécurité)
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return cb(
            new HttpException(
              'Seuls les fichiers JPG, JPEG et PNG sont autorisés !',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(@Request() req, @UploadedFile() file: Express.Multer.File) {
    // Vérification que le fichier existe
    if (!file) {
      throw new HttpException('Aucun fichier fourni.', HttpStatus.BAD_REQUEST);
    }

    // Construction du chemin d'accès à l'image pour le stockage en BDD
    const imagePath = `/uploads/${file.filename}`;

    // Mise à jour de la photo de profil dans la base de données
    await this.userService.updatePhoto(req.user.userId, imagePath);

    // Retourne une réponse avec un message de succès et l'URL de l'image
    return {
      message: '✅ Photo de profil mise à jour avec succès !',
      imageUrl: imagePath,
    };
  }
}
