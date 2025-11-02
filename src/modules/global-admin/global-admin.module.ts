import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GlobalAdminService } from './global-admin.service';
import { GlobalAdminController } from './global-admin.controller';
import { InviteToken } from './entities/invite-token.entity';
import { GlobalAdmin } from './entities/global-admin.entity';
import { OrganizationAdmin } from '../organizations/entities/organization-admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InviteToken, OrganizationAdmin, GlobalAdmin]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: config.getOrThrow('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  providers: [GlobalAdminService],
  controllers: [GlobalAdminController],
  exports: [TypeOrmModule],
})
export class GlobalAdminModule {}
