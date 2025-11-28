import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TokenService } from './services/token.service';
import { TokenHashService } from './services/token-hash.service';
import { InviteTokenService } from './services/invite-token.service';
import { FileService } from './services/file.service';
import { OrganizationOwnershipValidator } from './validators/organization-ownership.validator';
import { FileValidator } from './validators/file.validator';
import { InviteToken } from '../modules/global-admin/entities/invite-token.entity';
import { Organization } from '../modules/organizations/entities/organization.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([InviteToken, Organization]),
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
  providers: [
    TokenService,
    TokenHashService,
    InviteTokenService,
    FileService,
    OrganizationOwnershipValidator,
    FileValidator,
  ],
  exports: [
    TokenService,
    TokenHashService,
    InviteTokenService,
    FileService,
    OrganizationOwnershipValidator,
    FileValidator,
  ],
})
export class SharedModule {}
