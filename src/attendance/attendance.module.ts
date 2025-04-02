import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PrismaService } from '../prisma.service';

/**
 * Module de gestion des présences et pointages
 * 
 * Ce module encapsule toutes les fonctionnalités liées au pointage des utilisateurs:
 * - Enregistrement des arrivées et départs (clock-in/clock-out)
 * - Gestion des lieux de pointage avec validation géographique
 * - Historique des pointages et reporting
 * - Gestion des localisations autorisées pour le pointage
 * 
 * Il constitue le coeur fonctionnel de l'application de pointage,
 * permettant de suivre la présence des employés dans des lieux définis.
 */
@Module({
  // Contrôleur qui expose les endpoints API pour les opérations de pointage
  // Inclut les routes pour pointer, consulter l'historique et gérer les lieux
  controllers: [AttendanceController],
  
  // Services nécessaires au fonctionnement du module
  providers: [
    // Service principal de gestion des pointages:
    // - Logique de validation des positions GPS
    // - Calcul des distances entre l'utilisateur et les lieux de pointage
    // - Gestion des horaires de présence
    AttendanceService,
    
    // Service d'accès à la base de données via Prisma ORM
    // Utilisé pour persister les données de pointage et de localisation
    PrismaService
  ],
  
  // Ce module n'exporte pas ses services car ils sont utilisés
  // uniquement en interne via le contrôleur
})
export class AttendanceModule {}
