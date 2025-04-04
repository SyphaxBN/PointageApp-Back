import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { hash, compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserPayload } from './jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';
import { LogUserDto } from './dto/login-user.dto';
import { MailerService } from 'src/mailer.service';
import { createId } from '@paralleldrive/cuid2';
import { ResetUserPasswordDto } from './dto/reset-user-password';
import { Role } from '@prisma/client';

/**
 * Service d'authentification
 * Gère l'ensemble des opérations liées à l'authentification des utilisateurs:
 * - Connexion (login)
 * - Inscription (register)
 * - Réinitialisation de mot de passe
 * - Gestion des rôles (admin/user)
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService, // Service Prisma pour les interactions avec la base de données
    private readonly jwtService: JwtService, // Service JWT pour la génération et vérification des tokens
    private readonly mailerService: MailerService, // Service d'envoi d'emails
  ) {}

  /**
   * Authentifie un utilisateur avec son email et mot de passe
   * @param authBody - Objet contenant l'email et le mot de passe de l'utilisateur
   * @returns Un objet contenant le token JWT et les informations de l'utilisateur en cas de succès
   */
  async login({ authBody }: { authBody: LogUserDto }) {
    try {
        const { email, password } = authBody;

        // Recherche de l'utilisateur dans la base de données
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!existingUser) {
            throw new Error("Aucun utilisateur trouvé avec cet email.");
        }

        // Vérification du mot de passe
        const isPasswordValid = await this.isPasswordValid({
            password,
            hashedPassword: existingUser.password,
        });

        if (!isPasswordValid) {
            throw new Error('Le mot de passe est incorrecte.');
        }

        // Authentification réussie, génération du token JWT
        const token = this.authenticateUser({ 
          userId: existingUser.id,
          role: existingUser.role,  
        });

        // Renvoie une réponse avec le token et les informations de l'utilisateur
        return {
            status: 200,
            error: false,
            message: "Connexion réussie !",
            access_token: token.access_token,
            user: {
                id: existingUser.id,
                email: existingUser.email,
                name: existingUser.name,
                role: existingUser.role,
                photo: existingUser.photo, // Ajout de la photo de profil
            },
        };
    } catch (error) {
        return {
            status: 400,
            error: true,
            message: error.message,
        };
    }
  }

  /**
   * Inscrit un nouvel utilisateur dans la base de données
   * @param registerBody - Objet contenant les informations d'inscription (email, nom, mot de passe)
   * @returns Un objet contenant le token JWT en cas de succès
   */
  async register({ registerBody }: { registerBody: CreateUserDto }) {
    try {
      const { email, name, password } = registerBody;

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error('Un compte existe deja avec cette adresse email.');
      }

      const hashedPassword = await this.hashPassword({ password });

      const createdUser = await this.prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'USER',  // Ajout du rôle USER par défaut
        },
      });

      await this.mailerService.sendCreatedAccountEmail({
        name,
        recipient: email,
      });

      return this.authenticateUser({ 
        userId: createdUser.id,
        role: createdUser.role, 
      });
    } catch (error) {
      return {
        error: true,
        message: error.message,
      };
    }
  }

  /**
   * Hache un mot de passe en clair pour un stockage sécurisé
   * @param password - Mot de passe en clair
   * @returns Mot de passe haché
   */
  private async hashPassword({ password }: { password: string }) {
    return await hash(password, 10); // Utilisation de bcrypt avec 10 tours de salage
  }

  /**
   * Vérifie si un mot de passe en clair correspond à un mot de passe haché
   * @param password - Mot de passe en clair
   * @param hashedPassword - Mot de passe haché stocké en base de données
   * @returns Boolean indiquant si le mot de passe est valide
   */
  private async isPasswordValid({
    password,
    hashedPassword,
  }: {
    password: string;
    hashedPassword: string;
  }) {
    return await compare(password, hashedPassword); // Comparaison avec bcrypt
  }

  /**
   * Génère un token JWT pour l'utilisateur authentifié
   * @param userId - ID de l'utilisateur
   * @param role - Rôle de l'utilisateur (ADMIN ou USER)
   * @returns Objet contenant le token JWT
   */
  private authenticateUser({ userId, role }: UserPayload) {
    const payload: UserPayload = { userId, role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Initie le processus de réinitialisation de mot de passe
   * @param email - Email de l'utilisateur
   * @returns Message de confirmation ou d'erreur
   */
  async resetUserPasswordRequest({ email }: { email: string; }) {
    try {
      const existingUser = await this.prisma.user.findUnique({
          where: { email },
      });

      if (!existingUser) {
          throw new Error("L'utilisateur n'existe pas.");
      }

      let message = "Veuillez consulter vos emails pour réinitialiser votre mot de passe.";
      let alreadyRequested = false;

      if (existingUser.isResettingPassword) {
          message = "Une demande de réinitialisation de mot de passe est déjà en cours.";
          alreadyRequested = true;
      } else {
          const createdId = createId();
          await this.prisma.user.update({
              where: { email },
              data: {
                  isResettingPassword: true,
                  resetPasswordToken: createdId,
              },
          });

          await this.mailerService.sendRequestedPasswordEmail({
              name: existingUser.name ?? 'User',
              recipient: existingUser.email,
              token: createdId,
          });
      }

      // Renvoie immédiatement le message
      const response = {
          error: false,
          message,
      };

      // Si une demande existait déjà, ajoute un délai avant la transition
      if (alreadyRequested) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return response;
  } catch (error) {
      return {
          error: true,
          message: error.message,
      };
  }
  }

  /**
   * Vérifie si un token de réinitialisation de mot de passe est valide
   * @param token - Token de réinitialisation
   * @returns Boolean indiquant si le token est valide
   */
  async verifyResetPasswordToken({ token }: { token: string; }) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { 
          resetPasswordToken: token,
         },
      });

      if (!existingUser) {
        throw new Error("L'utilisateur n'existe pas.");
      }

      if (existingUser.isResettingPassword === false) {
        throw new Error("Aucune demande de réinitialisation de mot de passe n'est en cours.");
      }

      return {
        error: false,
        message: "Le token est valide et peut être utilisé.",
      };

     // return this.authenticateUser({ userId: existingUser.id });

    } catch (error) {
      return {
        error: true,
        message: error.message,
      };
    }
  }

  /**
   * Réinitialise le mot de passe d'un utilisateur
   * @param resetPasswordDto - Objet contenant le nouveau mot de passe et le token
   * @returns Message de confirmation ou d'erreur
   */
  async resetUserPassword({ resetPasswordDto }: { resetPasswordDto: ResetUserPasswordDto; }) {
    try {
      const { password, token } = resetPasswordDto;
      const existingUser = await this.prisma.user.findUnique({
        where: { resetPasswordToken: token },
      });

      if (!existingUser) {
        throw new Error("L'utilisateur n'existe pas.");
      }

      if (existingUser.isResettingPassword === false) {
        throw new Error("Aucune demande de réinitialisation de mot de passe n'est en cours.");
      }

      const hashedPassword = await this.hashPassword({ password });
      await this.prisma.user.update({
        where: {resetPasswordToken: token},
        data: {
          isResettingPassword: false,
          password:hashedPassword,
        },
      });

      return {
        error: false,
        message: "Votre mot de passe a été réinitialisé avec succès.",
      };

     // return this.authenticateUser({ userId: existingUser.id });

    } catch (error) {
      return {
        error: true,
        message: error.message,
      };
    }
  }

  /**
   * Promeut un utilisateur en administrateur
   * @param userId - ID de l'utilisateur à promouvoir
   * @returns Message de confirmation ou d'erreur
   */
  async promoteToAdmin({ userId }: { userId: string }) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
  
      if (!user) {
        throw new Error("L'utilisateur n'existe pas.");
      }
  
      if (user.role === 'ADMIN') {
        throw new Error("L'utilisateur est déjà administrateur.");
      }
  
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: Role.ADMIN },
      });
  
      return { error: false, message: "Utilisateur promu en administrateur avec succès." };
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  /**
   * Rétrograde un administrateur en utilisateur normal
   * @param userId - ID de l'administrateur à rétrograder
   * @returns Message de confirmation ou d'erreur
   */
  async demoteFromAdmin({ userId }: { userId: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Utilisateur non trouvé');
  
    if (user.role !== 'ADMIN') {
      throw new Error('Cet utilisateur n’est pas admin');
    }
  
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'USER' },
    });
  
    return { message: `Le rôle de l'utilisateur a été changé en USER.` };
  }
  
}
