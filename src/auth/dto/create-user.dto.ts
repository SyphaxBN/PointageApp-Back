import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Data Transfer Object (DTO) pour la création d'un utilisateur
 * 
 * Ce DTO définit la structure et les règles de validation des données
 * envoyées lors de l'inscription d'un nouvel utilisateur.
 * Il utilise class-validator pour assurer l'intégrité des données.
 */
export class CreateUserDto {
  /**
   * Adresse email de l'utilisateur
   * 
   * @validations
   * - Doit être une adresse email valide (format xxx@xxx.xxx)
   * 
   * Cette propriété sert d'identifiant unique pour l'utilisateur
   * dans le système d'authentification.
   */
  @IsEmail({}, {
    message: 'Veuillez entrer une adresse email valide',
  })
  email: string;

  /**
   * Mot de passe de l'utilisateur
   * 
   * @validations
   * - Ne peut pas être vide
   * - Doit contenir au moins 8 caractères
   * 
   * Le mot de passe sera haché avec bcrypt avant d'être stocké
   * dans la base de données pour des raisons de sécurité.
   */
  @IsNotEmpty()
  @MinLength(8,{
    message: 'Votre mot de passe doit contenir au moins 8 caractères',
  })
  password: string;

  /**
   * Nom complet de l'utilisateur
   * 
   * @validations
   * - Doit être une chaîne de caractères valide
   * 
   * Ce nom sera affiché dans l'interface utilisateur et
   * utilisé dans les communications (emails, notifications).
   */
  @IsString({
    message: 'Vous devez entrer un nom valide',
  })
  name: string;
}