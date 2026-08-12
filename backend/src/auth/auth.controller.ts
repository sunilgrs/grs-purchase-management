import { Body, Controller, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { Public } from './decorators/public.decorator.js';
import {
  CurrentUser,
  type AuthUser,
} from './decorators/current-user.decorator.js';

@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Patch('password')
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
