import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from 'src/prisma.service';

/**
 * Module de gestion des utilisateurs
 * 
 * Ce module regroupe toutes les fonctionnalités liées à la gestion des utilisateurs:
 * - Récupération des profils utilisateurs
 * - Suppression des comptes
 * - Gestion des photos de profil
 * - Services liés aux utilisateurs
 * 
 * Il encapsule le contrôleur et les services nécessaires pour ces fonctionnalités,
 * et est importé par le module principal de l'application (AppModule).
 */
@Module({
  // Déclaration du contrôleur qui définit les routes API pour les utilisateurs
  // Ce contrôleur expose les endpoints comme /users, /users/:userId, /users/upload-photo
  controllers: [UserController],
  
  // Déclaration des services utilisés par ce module
  // - UserService: Contient la logique métier pour la gestion des utilisateurs
  // - PrismaService: Fournit l'accès à la base de données via Prisma ORM
  providers: [UserService, PrismaService],
  
  // Ce module exporte UserService pour qu'il puisse être utilisé dans d'autres modules
  // Par exemple, le module d'authentification pourrait avoir besoin de récupérer des
  // informations sur les utilisateurs
  exports: [UserService],
})
export class UserModule {}
