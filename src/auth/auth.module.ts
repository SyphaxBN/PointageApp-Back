import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { UserService } from 'src/user/user.service';
import { MailerService } from 'src/mailer.service';

/**
 * Module d'authentification
 * 
 * Ce module regroupe tous les composants nécessaires à l'authentification, 
 * la gestion des utilisateurs et la sécurité de l'application:
 * - Authentification par token JWT
 * - Inscription et connexion des utilisateurs
 * - Réinitialisation de mot de passe
 * - Gestion des rôles et permissions
 */
@Module({
  imports: [
    // Configuration du module JWT pour l'authentification par token
    JwtModule.register({
      // Utilise la clé secrète définie dans les variables d'environnement
      // Cette clé est utilisée pour signer les tokens JWT
      secret: process.env.JWT_SECRET,
      
      // Rend le service JWT disponible globalement dans l'application
      global: true,
      
      // Options de signature des tokens
      signOptions: { 
        expiresIn: '30d', // Durée de validité des tokens: 30 jours
      },
    }),
  ],
  
  // Contrôleur exposant les endpoints d'authentification
  // (login, register, reset-password, etc.)
  controllers: [AuthController],
  
  // Services et providers nécessaires au fonctionnement du module
  providers: [
    // Service d'accès à la base de données via Prisma ORM
    PrismaService,
    
    // Service principal d'authentification (logique métier)
    AuthService,
    
    // Stratégie JWT pour Passport (configuration de l'extraction et validation des tokens)
    JwtStrategy,
    
    // Service de gestion des utilisateurs (importé du module User)
    UserService,
    
    // Service d'envoi d'emails (pour les réinitialisations de mot de passe, etc.)
    MailerService,
  ],
  
  // Ce module ne nécessite pas d'exports car ses services
  // sont principalement utilisés en interne ou via les controllers
})
export class AuthModule {}