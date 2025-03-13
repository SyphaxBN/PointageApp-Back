import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) return true;


    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new ForbiddenException("Accès interdit.");
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ForbiddenException("Token manquant ou invalide.");
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = this.jwtService.verify(token) as { role: string };
    const userRole = decodedToken.role as string; // Convertit en string pour la comparaison

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException("Vous n'avez pas les permissions nécessaires.");
  }

    return true;
  }
}
