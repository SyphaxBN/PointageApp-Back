import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LogUserDto {
  @IsEmail({}, {
    message: 'Veuillez entrer une adresse email valide',
  })
  email: string;

  @IsNotEmpty()
  @MinLength(8,{
    message: 'Votre mot de passe doit contenir au moins 8 caractères',
  })
  password: string;

}