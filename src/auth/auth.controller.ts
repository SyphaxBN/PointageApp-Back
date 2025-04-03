import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RequestWithUser } from './jwt.strategy';
import { UserService } from 'src/user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LogUserDto } from './dto/login-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

/**
 * Contrôleur d'authentification
 * Gère les routes API liées à l'authentification et à la gestion des rôles:
 * - Connexion et inscription
 * - Récupération des informations utilisateur
 * - Réinitialisation de mot de passe
 * - Promotion/rétrogradation des rôles
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService, // Service d'authentification
    private readonly userService: UserService // Service utilisateur
  ) {}

  /**
   * Endpoint pour l'authentification d'un utilisateur
   * Route: POST /auth/login
   * @param authBody - Objet contenant l'email et le mot de passe
   * @returns Objet contenant le token JWT et les informations de l'utilisateur
   */
  @Post('login')
  async login(@Body() authBody: LogUserDto) {
    return await this.authService.login({ authBody });
  }

  /**
   * Endpoint pour l'inscription d'un nouvel utilisateur
   * Route: POST /auth/register
   * @param registerBody - Objet contenant les informations d'inscription (email, nom, mot de passe)
   * @returns Objet contenant le token JWT et les informations du nouvel utilisateur
   */
  @Post('register')
  async register(@Body() registerBody: CreateUserDto) {
    return await this.authService.register({ registerBody });
  }

  /**
   * Endpoint pour demander une réinitialisation de mot de passe
   * Route: POST /auth/request-reset-password
   * @param email - Email de l'utilisateur demandant la réinitialisation
   * @returns Message de confirmation (toujours positif pour des raisons de sécurité)
   */
  @Post('request-reset-password')
  async resetUserPasswordRequest(@Body('email') email: string) {
    return await this.authService.resetUserPasswordRequest({ email });
  }

  /**
   * Endpoint pour réinitialiser le mot de passe d'un utilisateur
   * Route: POST /auth/reset-password
   * @param resetPasswordDto - Objet contenant le token et le nouveau mot de passe
   * @returns Message de confirmation ou d'erreur
   */
  @Post('reset-password')
  async resetUserPassword(@Body() resetPasswordDto: ResetUserPasswordDto) {
    return await this.authService.resetUserPassword({ resetPasswordDto });
  }

  /**
   * Endpoint pour vérifier la validité d'un token de réinitialisation
   * Route: GET /auth/verify-reset-password-token
   * @param token - Token de réinitialisation à vérifier
   * @returns Booléen indiquant si le token est valide
   */
  @Get('verify-reset-password-token')
  async verifyResetPasswordToken(@Query('token') token: string) {
    return await this.authService.verifyResetPasswordToken({ token });
  }

  /**
   * Endpoint pour récupérer les informations de l'utilisateur authentifié
   * Route: GET /auth
   * @param request - Requête contenant les informations de l'utilisateur authentifié
   * @returns Informations de l'utilisateur (sans mot de passe)
   * @requires Authentication
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAuthenticatedUser(@Request() request: RequestWithUser) {
    console.log('🔥 Requête reçue pour /auth', request.user);
    return await this.userService.getUser({ userId: request.user.userId });
  }

  /**
   * Endpoint pour promouvoir un utilisateur au rôle d'administrateur
   * Route: POST /auth/promote-to-admin
   * @param userId - ID de l'utilisateur à promouvoir
   * @returns Message de confirmation
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('promote-to-admin')
  async promoteToAdmin(@Body() { userId }: { userId: string }) {
    return this.authService.promoteToAdmin({ userId });
  }

  /**
   * Endpoint pour rétrograder un administrateur au rôle d'utilisateur
   * Route: POST /auth/demote-from-admin
   * @param userId - ID de l'administrateur à rétrograder
   * @returns Message de confirmation
   * @requires Authentication, Role: ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('demote-from-admin')
  async demoteFromAdmin(@Body() { userId }: { userId: string }) {
    return this.authService.demoteFromAdmin({ userId });
  }

  /**
   * Endpoint pour l'authentification des administrateurs (dashboard admin)
   * Route: POST /auth/admin-login
   * @param authBody - Objet contenant l'email et le mot de passe
   * @returns Objet contenant le token JWT et les informations de l'administrateur
   * @throws Error si l'utilisateur n'a pas le rôle ADMIN
   */
  @Post('admin-login')
  async adminLogin(@Body() authBody: LogUserDto) {
    const loginResult = await this.authService.login({ authBody });
    
    // Vérifie si la connexion a réussi et si l'utilisateur est un administrateur
    if (loginResult.error === false && loginResult.user && loginResult.user.role === 'ADMIN') {
      return loginResult;
    }
    
    // Si l'utilisateur n'est pas un administrateur ou si la connexion a échoué
    return {
      status: 403,
      error: true,
      message: "Accès interdit. Cette interface est réservée aux administrateurs.",
    };
  }
}