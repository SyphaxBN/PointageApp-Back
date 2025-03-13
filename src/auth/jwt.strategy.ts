import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

export type UserPayload = { 
  userId: string;
  role: Role;
};

export type RequestWithUser = {
  user: UserPayload;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'defaultSecretKey',
    });
  }

  async validate(payload: UserPayload): Promise<UserPayload> {
    return { userId: payload.userId, role: payload.role };
  }
}