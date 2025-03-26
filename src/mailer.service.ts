import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER, // 💡 Stocke ces valeurs dans un .env
        pass: process.env.EMAIL_PASS,
      },
    });
  }

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
