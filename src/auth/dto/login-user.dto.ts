import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

/**
 * Data Transfer Object (DTO) pour l'authentification d'un utilisateur
 * 
 * Ce DTO définit la structure et les règles de validation des données
 * envoyées lors de la connexion d'un utilisateur (login).
 * Il garantit que les identifiants fournis respectent le format attendu
 * avant même de vérifier leur validité dans la base de données.
 */
export class LogUserDto {
  /**
   * Adresse email de l'utilisateur
   * 
   * @validations
   * - Doit être une adresse email valide (format xxx@xxx.xxx)
   * 
   * Utilisée comme identifiant principal pour retrouver l'utilisateur
   * dans la base de données lors de l'authentification.
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
   * Ce mot de passe sera comparé avec la version hachée
   * stockée dans la base de données pour authentifier l'utilisateur.
   * La validation de longueur minimale permet d'éviter les tentatives
   * avec des mots de passe trop courts qui seraient nécessairement invalides.
   */
  @IsNotEmpty()
  @MinLength(8,{
    message: 'Votre mot de passe doit contenir au moins 8 caractères',
  })
  password: string;
}