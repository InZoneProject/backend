import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GlobalAdmin } from '../global-admin/entities/global-admin.entity';
import { OrganizationAdmin } from '../organizations/entities/organization-admin.entity';
import { TagAdmin } from '../tag-admin/entities/tag-admin.entity';
import { Employee } from '../employees/entities/employee.entity';
import { InviteToken } from '../global-admin/entities/invite-token.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { GlobalAdminModule } from '../global-admin/global-admin.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { EmailService } from '../../shared/services/email.service';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([
      GlobalAdmin,
      OrganizationAdmin,
      TagAdmin,
      Employee,
      InviteToken,
      EmailVerification,
    ]),
    GlobalAdminModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthStrategy, RolesGuard, EmailService],
  exports: [AuthService, RolesGuard, JwtAuthStrategy, PassportModule],
})
export class AuthModule {}
