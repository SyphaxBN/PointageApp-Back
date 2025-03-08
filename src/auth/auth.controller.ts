import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RequestWithUser } from './jwt.strategy';
import { UserService } from 'src/user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LogUserDto } from './dto/login-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password';


@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {}
    // localhost:8000/auth/login

    @Post('login')
    async login(@Body() authBody: LogUserDto) {  
        return await this.authService.login({
             authBody, 
            });
    }

    @Post('register')
    async register(@Body() registerBody: CreateUserDto) {  
        return await this.authService.register({
            registerBody, 
            });
    }

    @Post('request-reset-password')
    async resetUserPasswordRequest(@Body('email') email: string) {  
        return await this.authService.resetUserPasswordRequest({
            email, 
            });
    }

    @Post('reset-password')
    async resetUserPassword(@Body() resetPasswordDto: ResetUserPasswordDto) {  
        return await this.authService.resetUserPassword({
            resetPasswordDto,
            });
    }

    @Get('verify-reset-password-token')
    async verifyResetPasswordToken(@Query('token') token: string) {  
        return await this.authService.verifyResetPasswordToken({
            token, 
            });
    }

    // localhost:8000/auth
    
    @UseGuards(JwtAuthGuard)
    @Get()
    async getAuthenticatedUser(@Request() request: RequestWithUser) {
        console.log("🔥 Requête reçue pour /auth", request.user);
        return await this.userService.getUser({ userId: request.user.userId });
    }
}
