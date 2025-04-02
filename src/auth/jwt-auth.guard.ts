import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard d'authentification JWT
 * 
 * Ce guard protège les routes et endpoints qui nécessitent une authentification.
 * Il vérifie la présence et la validité du token JWT dans l'en-tête d'autorisation
 * de chaque requête HTTP entrante.
 * 
 * Fonctionnement:
 * 1. Intercepte la requête HTTP
 * 2. Extrait le token JWT de l'en-tête 'Authorization: Bearer [token]'
 * 3. Vérifie la validité du token (signature, expiration)
 * 4. Si valide, attache les informations de l'utilisateur (payload) à la requête (req.user)
 * 5. Si invalide, renvoie une erreur 401 Unauthorized
 * 
 * Exemple d'utilisation:
 * ```
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) {
 *   return req.user; // Contient les informations de l'utilisateur authentifié
 * }
 * ```
 * 
 * Ce guard utilise la stratégie JWT ('jwt') définie dans JwtStrategy.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}