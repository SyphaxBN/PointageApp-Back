import { SetMetadata } from '@nestjs/common';

/**
 * Décorateur de rôles
 * 
 * Ce décorateur permet de définir les rôles requis pour accéder à un endpoint.
 * Il est utilisé conjointement avec le RolesGuard pour implémenter
 * le contrôle d'accès basé sur les rôles (RBAC).
 * 
 * Exemple d'utilisation:
 * ```
 * @Roles('ADMIN')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('admin-only')
 * getAdminData() {
 *   return { message: "Données sensibles réservées aux administrateurs" };
 * }
 * ```
 * 
 * @param roles - Liste des rôles autorisés à accéder à la route (ex: 'ADMIN', 'USER')
 * @returns Un décorateur qui attache les rôles comme métadonnées à la route
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);