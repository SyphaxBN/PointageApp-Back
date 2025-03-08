import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma:PrismaService) {}
    async getUsers(){
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
        return users;
        }

        async getUser({ userId }: { userId: string }) {
          console.log("📌 Recherche utilisateur avec ID :", userId);
          const user = await this.prisma.user.findUnique({
            where: { 
              id: userId,
             },
            select: {
              id: true,
              email: true,
              name: true,
            },
          });
          console.log("🔍 Résultat trouvé :", user);
            return user;
            }
}
