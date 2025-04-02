import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';

/**
 * Service d'envoi d'emails
 * Gère l'envoi des emails transactionnels:
 * - Email de bienvenue après inscription
 * - Email de réinitialisation de mot de passe
 */
@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configuration du transporteur nodemailer pour l'envoi d'emails via Gmail
    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER, // Adresse email configurée dans le .env
        pass: process.env.EMAIL_PASS, // Mot de passe d'application configuré dans le .env
      },
    });
  }

  /**
   * Envoie un email de bienvenue à un nouvel utilisateur
   * @param recipient - Adresse email du destinataire
   * @param name - Nom de l'utilisateur
   */
  async sendCreatedAccountEmail({
    recipient,
    name,
  }: {
    recipient: string;
    name: string;
  }) {
    try {
      const mailOptions = {
        from: `"Pointage App" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject: 'Bienvenue dans la plateforme',
        html: `<p>Bonjour <strong>${name}</strong>, bienvenue dans NestJS !</p>`,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email envoyé:', info.response);
    } catch (error) {
      console.error('Erreur lors de l’envoi de l’email:', error);
    }
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   * @param recipient - Adresse email du destinataire
   * @param name - Nom de l'utilisateur
   * @param token - Token de réinitialisation
   */
  async sendRequestedPasswordEmail({
    recipient,
    name,
    token,
  }: {
    recipient: string;
    name: string;
    token: string;
  }) {
    try {
      const link = `${token}`;
      const mailOptions = {
        from: `"Pointage App" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject: 'Réinitialisation de votre mot de passe',
        html: `<p>Bonjour <strong>${name}</strong>,</p>
               <p>Voici votre token pour réinitialiser votre mot de passe :</p>
               <a href="${link}">${link}</a>`,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email envoyé:', info.response);
    } catch (error) {
      console.error('Erreur lors de l’envoi de l’email:', error);
    }
  }
}
