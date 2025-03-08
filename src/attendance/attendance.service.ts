import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Attendance } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // Fonction pour formater la date
  private formatDate(date: Date | null): string | null {
    if (!date) return null;
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  // Pointer l'arrivée
  async clockIn(userId: string, location: string): Promise<any> {
    const lastAttendance = await this.prisma.attendance.findFirst({
      where: { userId, clockOut: null },
    });

    if (lastAttendance) {
      throw new BadRequestException('Vous avez déjà pointé une arrivée sans enregistrer un départ.');
    }

    const clockInTime = new Date();

    const attendance = await this.prisma.attendance.create({
      data: { userId, clockIn: clockInTime, location },
    });

    return {
      ...attendance,
      clockIn: this.formatDate(attendance.clockIn),
    };
  }

  // Pointer le départ
  async clockOut(userId: string): Promise<any> {
    const attendance = await this.prisma.attendance.findFirst({
      where: { userId, clockOut: null },
    });

    if (!attendance) {
      throw new NotFoundException("Aucune arrivée enregistrée, vous ne pouvez pas pointer votre départ.");
    }

    const clockOutTime = new Date();

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: { clockOut: clockOutTime },
    });

    return {
      ...updatedAttendance,
      clockIn: this.formatDate(updatedAttendance.clockIn),
      clockOut: this.formatDate(updatedAttendance.clockOut),
    };
  }

  // Récupérer l'historique des pointages d'un utilisateur avec nom et email
  async getUserAttendance(userId: string) {
    return this.prisma.attendance
      .findMany({
        where: { userId },
        orderBy: { clockIn: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
      .then((attendances) =>
        attendances.map((a) => ({
          id: a.id,
          name: a.user.name,
          email: a.user.email,
          clockIn: this.formatDate(a.clockIn),
          clockOut: this.formatDate(a.clockOut),
          location: a.location,
          createdAt: this.formatDate(a.createdAt),
        }))
      );
  }
}
