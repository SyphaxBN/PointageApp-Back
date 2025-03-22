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

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 📌 Récupérer tous les utilisateurs (réservé aux Admins)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  getUsers() {
    return this.userService.getUsers();
  }

  // 📌 Récupérer un utilisateur par ID (réservé aux Admins)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('/:userId')
  getUser(@Param('userId') userId: string) {
    return this.userService.getUser({ userId });
  }

  // 📌 Supprimer un utilisateur (réservé aux Admins)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('/:userId')
  deleteUser(@Param('userId') userId: string) {
    return this.userService.deleteUser(userId);
  }
  // 📌 Upload photo de profil
  @UseGuards(JwtAuthGuard)
  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads', // 📂 Stockage local (remplace par Cloudinary/S3 si besoin)
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `profile-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // Limite de 2MB
      fileFilter: (_req, file, cb) => {
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
    if (!file) {
      throw new HttpException('Aucun fichier fourni.', HttpStatus.BAD_REQUEST);
    }

    const imagePath = `/uploads/${file.filename}`;

    await this.userService.updatePhoto(req.user.userId, imagePath);

    return {
      message: '✅ Photo de profil mise à jour avec succès !',
      imageUrl: imagePath,
    };
  }
}
