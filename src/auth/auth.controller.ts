import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RequestWithUser } from './jwt.strategy';
import { UserService } from 'src/user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LogUserDto } from './dto/login-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly userService: UserService) {}

  @Post('login')
  async login(@Body() authBody: LogUserDto) {
    return await this.authService.login({ authBody });
  }

  @Post('register')
  async register(@Body() registerBody: CreateUserDto) {
    return await this.authService.register({ registerBody });
  }

  @Post('request-reset-password')
  async resetUserPasswordRequest(@Body('email') email: string) {
    return await this.authService.resetUserPasswordRequest({ email });
  }

  @Post('reset-password')
  async resetUserPassword(@Body() resetPasswordDto: ResetUserPasswordDto) {
    return await this.authService.resetUserPassword({ resetPasswordDto });
  }

  @Get('verify-reset-password-token')
  async verifyResetPasswordToken(@Query('token') token: string) {
    return await this.authService.verifyResetPasswordToken({ token });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAuthenticatedUser(@Request() request: RequestWithUser) {
    console.log('🔥 Requête reçue pour /auth', request.user);
    return await this.userService.getUser({ userId: request.user.userId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('promote-to-admin')
  async promoteToAdmin(@Body() { userId }: { userId: string }) {
    return this.authService.promoteToAdmin({ userId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('demote-from-admin')
  async demoteFromAdmin(@Body() { userId }: { userId: string }) {
    return this.authService.demoteFromAdmin({ userId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin-only')
  async adminRoute() {
    return { message: "Bienvenue Admin !" };
  }
  
}