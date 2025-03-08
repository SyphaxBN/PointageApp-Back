import { Resend } from 'resend';

export class MailerService {
  private readonly mailer: Resend;
  constructor() {
    this.mailer = new Resend(process.env.RESEND_API_KEY || 're_NMDGg56c_NifjNqdhXGfjvmoZ7zYAMrX1');
  }

    async sendCreatedAccountEmail({
        recipient, 
        name,
    }: {
        recipient: string;
        name: string;
    }) { 
        try{ 
          const data = await this.mailer.emails.send({
            from: 'Acme <onboarding@resend.dev>',
            to: [recipient],
            subject: 'Bienvenue dans la platforme',
            html: `Bonjour ${name} et Bienvenue dans NestJS`,
          });
        
          console.log(data);
        } catch(error) {        
          console.log(error);
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
      try{ 
        const link = `token=${token}`;
        const data = await this.mailer.emails.send({
          from: 'Acme <onboarding@resend.dev>',
          to: [recipient],
          subject: 'Pour réinisialiser votre mot de passe...',
          html: `Bonjour ${name} , voici votre token pour réinisialiser votre mot de passe : ${link}`,
        });
      
        console.log(data);
      } catch(error) {        
        console.log(error);
      }
  }

}
