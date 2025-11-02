import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalAdmin } from '../../global-admin/entities/global-admin.entity';
import { OrganizationAdmin } from '../../organizations/entities/organization-admin.entity';
import { JwtPayload } from '../types/jwt-payload.types';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(GlobalAdmin)
    private globalAdminRepository: Repository<GlobalAdmin>,
    @InjectRepository(OrganizationAdmin)
    private organizationAdminRepository: Repository<OrganizationAdmin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.role === UserRole.GLOBAL_ADMIN) {
      const globalAdmin = await this.globalAdminRepository.findOne({
        where: { global_admin_id: payload.sub },
      });

      if (!globalAdmin) {
        throw new UnauthorizedException();
      }

      return {
        userId: payload.sub,
        role: UserRole.GLOBAL_ADMIN,
      };
    } else if (payload.role === UserRole.ORGANIZATION_ADMIN) {
      const orgAdmin = await this.organizationAdminRepository.findOne({
        where: { organization_admin_id: payload.sub },
      });

      if (!orgAdmin) {
        throw new UnauthorizedException();
      }

      return {
        userId: payload.sub,
        role: UserRole.ORGANIZATION_ADMIN,
      };
    }

    throw new UnauthorizedException();
  }
}
