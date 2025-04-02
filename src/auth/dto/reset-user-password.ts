import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Data Transfer Object (DTO) pour la réinitialisation du mot de passe
 * 
 * Ce DTO définit la structure et les règles de validation des données
 * envoyées lors d'une demande de réinitialisation de mot de passe.
 * Il garantit que le nouveau mot de passe respecte les règles de sécurité
 * et que le token de réinitialisation est bien présent.
 */
export class ResetUserPasswordDto {
  /**
   * Nouveau mot de passe de l'utilisateur
   * 
   * @validations
   * - Ne peut pas être vide
   * - Doit contenir au moins 8 caractères
   * 
   * Ce mot de passe sera haché avec bcrypt avant d'être
   * enregistré dans la base de données, remplaçant l'ancien.
   * La règle de longueur minimale assure un niveau de sécurité de base.
   */
  @IsNotEmpty()
  @MinLength(8, {
    message: 'Votre mot de passe doit contenir au moins 8 caractères',
  })
  password: string;

  /**
   * Token de réinitialisation du mot de passe
   * 
   * @validations
   * - Doit être une chaîne de caractères valide
   * 
   * Ce token est généré lors de la demande de réinitialisation
   * et envoyé à l'utilisateur par email. Il permet de vérifier
   * que la demande de réinitialisation est légitime et provient
   * bien du propriétaire du compte.
   * 
   * Il est utilisé pour identifier l'utilisateur dont le mot de passe
   * doit être réinitialisé, sans nécessiter une authentification préalable.
   */
  @IsString({
    message: 'Le token de réinitialisation est invalide',
  })
  token: string;
}