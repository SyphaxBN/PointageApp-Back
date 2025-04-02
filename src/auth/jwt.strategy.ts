import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Type représentant le payload du token JWT
 * Contient l'identifiant utilisateur et son rôle
 * Ce payload est stocké dans le token JWT lors de sa création
 */
export type UserPayload = { 
  userId: string;
  role: Role;
};

/**
 * Type représentant une requête avec un utilisateur authentifié
 * Utilisé pour typer les objets de requête après authentification JWT
 */
export type RequestWithUser = {
  user: UserPayload;
};

/**
 * Stratégie JWT pour Passport
 * 
 * Cette classe définit comment les tokens JWT sont extraits et validés.
 * Elle est utilisée par le guard JwtAuthGuard pour protéger les routes
 * qui nécessitent une authentification.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Constructeur - Configure la stratégie JWT
   * 
   * Définit:
   * - Comment extraire le token JWT des requêtes entrantes (en-tête Authorization)
   * - Si les tokens expirés doivent être rejetés (oui)
   * - La clé secrète utilisée pour vérifier la signature des tokens
   */
  constructor() {
    super({
      // Extrait le token JWT de l'en-tête Authorization en format Bearer
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      
      // Rejette les tokens expirés
      ignoreExpiration: false,
      
      // Utilise la clé secrète définie dans les variables d'environnement
      // ou une clé par défaut si non définie (pour le développement uniquement)
      secretOrKey: process.env.JWT_SECRET || 'defaultSecretKey',
    });
  }

  /**
   * Valide le payload du token JWT
   * 
   * Cette méthode est appelée après que le token a été extrait et vérifié.
   * Elle reçoit le payload décodé du token et doit retourner l'objet
   * qui sera attaché à la requête (req.user).
   * 
   * @param payload - Payload du token JWT décodé
   * @returns Objet contenant l'ID utilisateur et son rôle, attaché à req.user
   */
  async validate(payload: UserPayload): Promise<UserPayload> {
    // Retourne le payload tel quel
    // On pourrait ajouter ici des vérifications supplémentaires
    // comme la vérification que l'utilisateur existe toujours en base de données
    return { userId: payload.userId, role: payload.role };
  }
}