import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AUTH_CONSTANTS } from './auth.constants';
import { LoginRequestDto } from './dto/login-request.dto';
import { RegisterByInviteRequestDto } from './dto/register-by-invite-request.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerificationStatusResponseDto } from './dto/verification-status-response.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { UserRole } from './enums/user-role.enum';
import type { RequestWithUser } from './types/request-with-user.types';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordChangeRequestDto } from './dto/password-change-request.dto';

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
    @Body() registerDto: RegisterByInviteRequestDto,
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

  @Post('tag-admin/register')
  async registerTagAdmin(
    @Body() registerDto: RegisterByInviteRequestDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerTagAdmin(
      registerDto.invite_token,
      registerDto.full_name,
      registerDto.email,
      registerDto.password,
    );
  }

  @Post('tag-admin/login')
  async loginTagAdmin(
    @Body() loginDto: LoginRequestDto,
  ): Promise<AuthResponseDto> {
    return this.authService.loginTagAdmin(loginDto.email, loginDto.password);
  }

  @Post('employee/register')
  async registerEmployee(
    @Body() registerDto: RegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerEmployee(
      registerDto.full_name,
      registerDto.email,
      registerDto.password,
    );
  }

  @Post('employee/login')
  async loginEmployee(
    @Body() loginDto: LoginRequestDto,
  ): Promise<AuthResponseDto> {
    return this.authService.loginEmployee(loginDto.email, loginDto.password);
  }

  @Post('verify-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async verifyEmail(
    @Body() verifyDto: VerifyEmailDto,
    @Req() req: RequestWithUser,
  ): Promise<{ is_verified: boolean }> {
    this.checkGlobalAdminAccess(req.user.role);
    const isVerified = await this.authService.verifyEmail(
      req.user.sub,
      req.user.role,
      verifyDto.code,
    );
    return { is_verified: isVerified };
  }

  @Post('resend-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async resendCode(@Req() req: RequestWithUser): Promise<{ message: string }> {
    this.checkGlobalAdminAccess(req.user.role);
    await this.authService.resendVerificationCode(req.user.sub, req.user.role);
    return { message: 'Verification code sent successfully' };
  }

  @Get('verification-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getVerificationStatus(
    @Req() req: RequestWithUser,
  ): Promise<VerificationStatusResponseDto> {
    this.checkGlobalAdminAccess(req.user.role);
    return this.authService.getVerificationStatus(req.user.sub, req.user.role);
  }

  @Post('employee/password-reset-request')
  async sendEmployeeResetPasswordLink(
    @Body() dto: PasswordResetRequestDto,
  ): Promise<void> {
    await this.authService.sendEmployeeResetPasswordLink(dto.email);
  }

  @Post('organization-admin/password-reset-request')
  async sendOrganizationAdminResetPasswordLink(
    @Body() dto: PasswordResetRequestDto,
  ): Promise<void> {
    await this.authService.sendOrganizationAdminResetPasswordLink(dto.email);
  }

  @Post('tag-admin/password-reset-request')
  async sendTagAdminResetPasswordLink(
    @Body() dto: PasswordResetRequestDto,
  ): Promise<void> {
    await this.authService.sendTagAdminResetPasswordLink(dto.email);
  }

  @Put('reset-password')
  async resetPassword(@Body() dto: PasswordChangeRequestDto): Promise<void> {
    await this.authService.resetPassword(dto.token, dto.new_password);
  }

  private checkGlobalAdminAccess(role: UserRole): void {
    if (role === UserRole.GLOBAL_ADMIN) {
      throw new UnauthorizedException(
        AUTH_CONSTANTS.ERROR_MESSAGES.GLOBAL_ADMIN_NO_VERIFICATION,
      );
    }
  }
}
