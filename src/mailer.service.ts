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
        subject: 'Bienvenue sur la plateforme Pointage App',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4a86e8; padding: 20px; color: white; text-align: center;">
          <h1>Bienvenue sur Pointage App</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <p>Bonjour <strong>${name}</strong>,</p>
          <p>Nous avons le plaisir de vous confirmer que votre compte a été créé avec succès.</p>
          <p>Vous pouvez dès à présent vous connecter à notre plateforme et commencer à l'utiliser.</p>
          <p>Nous vous souhaitons une excellente expérience sur notre application.</p>
          <p>Cordialement,<br>L'équipe Pointage App</p>
        </div>
          </div>
        `,
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
      const mailOptions = {
        from: `"Pointage App" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject: 'Réinitialisation de votre mot de passe',
        html: `
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Vous avez demandé une réinitialisation de votre mot de passe.</p>
        <p>Voici votre code de réinitialisation :</p>
        <div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; margin: 15px 0; font-family: monospace; font-size: 18px;">
          ${token}
        </div>
        <p>Copiez ce code et collez-le dans l'application pour continuer la procédure de réinitialisation.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.</p>
        <p>Cordialement,<br>L'équipe Pointage App</p>
      `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email envoyé:', info.response);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
    }
  }
}
