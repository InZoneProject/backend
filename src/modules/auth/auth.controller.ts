import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { RegisterOrganizationAdminRequestDto } from './dto/register-organization-admin-request.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('global-admin/login')
  async loginGlobalAdmin(
    @Body() loginDto: LoginRequestDto,
  ): Promise<AuthResponseDto> {
    return this.authService.loginGlobalAdmin(loginDto.email, loginDto.password);
  }

  @Post('organization-admin/register')
  async registerOrganizationAdmin(
    @Body() registerDto: RegisterOrganizationAdminRequestDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerOrganizationAdmin(
      registerDto.invite_token,
      registerDto.full_name,
      registerDto.email,
      registerDto.password,
    );
  }

  @Post('organization-admin/login')
  async loginOrganizationAdmin(
    @Body() loginDto: LoginRequestDto,
  ): Promise<AuthResponseDto> {
    return this.authService.loginOrganizationAdmin(
      loginDto.email,
      loginDto.password,
    );
  }
}
