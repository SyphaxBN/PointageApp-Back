import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, {
    message: 'Veuillez entrer une adresse email valide',
  })
  email: string;

  @IsNotEmpty()
  @MinLength(8,{
    message: 'Votre mot de passe doit contenir au moins 8 caractères',
  })
  password: string;

  @IsString({
    message: 'Vous devez entrer un nom valide',
  })
  name: string;
}