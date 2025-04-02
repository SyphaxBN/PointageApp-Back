import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Service Prisma pour l'accès à la base de données
 * 
 * Ce service encapsule le client Prisma ORM et gère la connexion à la base de données.
 * Il est injecté dans les autres services qui ont besoin d'accéder aux données.
 * 
 * Prisma sert d'ORM (Object-Relational Mapping) pour:
 * - Fournir une interface type-safe pour interagir avec la base de données PostgreSQL
 * - Gérer les migrations de schéma
 * - Offrir une API intuitive pour les requêtes CRUD
 * - Maintenir les relations entre les entités (Users, Attendance, Location)
 */
@Injectable()
export class PrismaService 
extends PrismaClient 
implements OnModuleInit, OnModuleDestroy 
{
  /**
   * Méthode appelée à l'initialisation du module
   * 
   * Établit la connexion à la base de données PostgreSQL
   * dès le démarrage de l'application, en utilisant la
   * chaîne de connexion définie dans les variables d'environnement.
   */
  async onModuleInit() {
    await this.$connect();
    console.log('📊 Connexion à la base de données établie');
  }

  /**
   * Méthode appelée à la destruction du module
   * 
   * Ferme proprement la connexion à la base de données
   * lorsque l'application s'arrête, évitant ainsi les
   * connexions fantômes et les fuites de ressources.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    console.log('📊 Déconnexion de la base de données effectuée');
  }
}
