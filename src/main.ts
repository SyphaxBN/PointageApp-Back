import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // Utilise NestExpressApplication
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Permettre l'accès aux fichiers statiques
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads', // Permet d'accéder aux fichiers via /uploads
  });

  app.enableCors(); // Autorise toutes les requêtes CORS

  await app.listen(process.env.PORT ?? 8000, '0.0.0.0');
}
bootstrap();
