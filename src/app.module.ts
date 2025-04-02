import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ConfigModule } from '@nestjs/config';

/**
 * Module principal de l'application
 * 
 * Le module racine qui configure l'ensemble de l'application et importe
 * tous les autres modules. Il définit la structure et les fonctionnalités
 * globales de l'application de pointage.
 */
@Module({
  imports: [
    // Module de gestion des utilisateurs (profils, photos, etc.)
    UserModule,
    
    // Module d'authentification (login, register, gestion des rôles, etc.)
    AuthModule,
    
    // Module de gestion des pointages (clock-in, clock-out, lieux, etc.)
    AttendanceModule,
    
    // Configuration globale à partir des variables d'environnement (.env)
    // isGlobal: true permet d'accéder aux variables d'env partout dans l'application
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // Configuration du serveur de fichiers statiques pour les photos de profil
    // Permet de servir les fichiers uploadés via des URLs simples
    ServeStaticModule.forRoot({
      // Chemin physique vers le dossier des uploads sur le serveur
      rootPath: join(__dirname, '..', 'uploads'),
      
      // Préfixe d'URL pour accéder aux fichiers
      // Les fichiers seront accessibles via `http://localhost:8000/uploads/...`
      serveRoot: '/uploads',
    }),
  ],
  
  // Aucun contrôleur supplémentaire au niveau racine
  // Les contrôleurs sont définis dans leurs modules respectifs
  controllers: [],
  
  // Aucun fournisseur de service supplémentaire au niveau racine
  // Les services sont définis dans leurs modules respectifs
  providers: [],
})
export class AppModule {}
