import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Fonction principale de démarrage de l'application
 * 
 * Cette fonction initialise et configure l'instance de l'application NestJS,
 * en définissant les middlewares globaux, les options de sécurité,
 * et en démarrant le serveur HTTP.
 */
async function bootstrap() {
  // Crée une instance de l'application NestJS avec Express comme moteur HTTP sous-jacent
  // L'utilisation du type NestExpressApplication permet d'accéder aux méthodes spécifiques à Express
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configuration du système de validation globale des DTO
  // Applique automatiquement les validations définies dans les classes DTO
  app.useGlobalPipes(
    new ValidationPipe({
      // Supprime les propriétés qui ne sont pas définies dans les DTO (sécurité)
      whitelist: true,
      
      // Convertit automatiquement les types primitifs selon les types définis dans les DTO
      // Ex: convertit "42" en nombre 42 si le DTO attend un number
      transform: true,
    }),
  );

  // Configuration du serveur de fichiers statiques pour les uploads
  // Cette configuration est complémentaire à celle de ServeStaticModule dans app.module.ts
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads', // Permet d'accéder aux fichiers via /uploads
  });

  // Activation du Cross-Origin Resource Sharing (CORS)
  // Permet aux clients web (frontend) de communiquer avec l'API
  // même s'ils sont hébergés sur des domaines différents
  app.enableCors(); 

  // Démarrage du serveur HTTP
  // Écoute sur le port défini dans les variables d'environnement ou 8000 par défaut
  // L'adresse '0.0.0.0' permet d'accepter les connexions de toutes les interfaces réseau
  await app.listen(process.env.PORT ?? 8000, '0.0.0.0');
  
  // Affiche l'URL de l'API dans la console pour faciliter le développement
  console.log(`🚀 Le BackeEnd de l'Application Mobile démmarrée sur : ${await app.getUrl()}`);
}

// Exécution de la fonction de démarrage
bootstrap();