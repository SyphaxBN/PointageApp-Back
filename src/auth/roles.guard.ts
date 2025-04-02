import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

/**
 * Guard de vérification des rôles utilisateur
 * 
 * Ce guard implémente le contrôle d'accès basé sur les rôles (RBAC).
 * Il est utilisé en complément du JwtAuthGuard pour restreindre l'accès 
 * aux routes en fonction du rôle de l'utilisateur authentifié.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * Constructeur du guard de rôles
   * 
   * @param reflector - Service permettant d'accéder aux métadonnées des décorateurs
   * @param jwtService - Service pour décoder et vérifier les tokens JWT
   */
  constructor(
    private reflector: Reflector, // Pour accéder aux métadonnées des routes
    private jwtService: JwtService // Pour vérifier le token JWT
  ) {}

  /**
   * Vérifie si l'utilisateur a les rôles requis pour accéder à une route
   * 
   * Cette méthode est appelée automatiquement par NestJS lors d'une requête
   * vers une route protégée par ce guard.
   * 
   * @param context - Contexte d'exécution contenant les informations sur la requête
   * @returns true si l'accès est autorisé, sinon lance une exception
   * @throws ForbiddenException si l'utilisateur n'a pas les permissions nécessaires
   */
  canActivate(context: ExecutionContext): boolean {
    // Récupère les rôles requis définis par le décorateur @Roles()
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    // Si aucun rôle n'est requis, autorise l'accès
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // Récupère l'objet requête HTTP
    const request = context.switchToHttp().getRequest();
    
    // Récupère l'en-tête d'autorisation
    const authHeader = request.headers.authorization;

    // Vérifie si l'en-tête d'autorisation existe
    if (!authHeader) {
      throw new ForbiddenException("Accès interdit.");
    }

    // Vérifie si l'en-tête d'autorisation a le format Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ForbiddenException("Token manquant ou invalide.");
    }

    // Extrait le token JWT de l'en-tête
    const token = authHeader.split(' ')[1];
    
    // Décode et vérifie le token JWT
    const decodedToken = this.jwtService.verify(token) as { role: string };
    
    // Récupère le rôle de l'utilisateur depuis le token décodé
    const userRole = decodedToken.role as string; // Convertit en string pour la comparaison

    // Vérifie si le rôle de l'utilisateur fait partie des rôles requis
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException("Vous n'avez pas les permissions nécessaires.");
    }

    // Autorise l'accès si le rôle est valide
    return true;
  }
}
