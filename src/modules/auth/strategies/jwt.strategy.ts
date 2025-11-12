import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalAdmin } from '../../global-admin/entities/global-admin.entity';
import { OrganizationAdmin } from '../../organizations/entities/organization-admin.entity';
import { TagAdmin } from '../../tag-admin/entities/tag-admin.entity';
import { Employee } from '../../employees/entities/employee.entity';
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
    @InjectRepository(TagAdmin)
    private tagAdminRepository: Repository<TagAdmin>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
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
        sub: payload.sub,
        role: UserRole.GLOBAL_ADMIN,
        is_email_verified: true,
      };
    } else if (payload.role === UserRole.ORGANIZATION_ADMIN) {
      const orgAdmin = await this.organizationAdminRepository.findOne({
        where: { organization_admin_id: payload.sub },
      });

      if (!orgAdmin) {
        throw new UnauthorizedException();
      }

      return {
        sub: payload.sub,
        role: UserRole.ORGANIZATION_ADMIN,
        is_email_verified: orgAdmin.is_email_verified,
      };
    } else if (payload.role === UserRole.TAG_ADMIN) {
      const tagAdmin = await this.tagAdminRepository.findOne({
        where: { tag_admin_id: payload.sub },
      });

      if (!tagAdmin) {
        throw new UnauthorizedException();
      }

      return {
        sub: payload.sub,
        role: UserRole.TAG_ADMIN,
        is_email_verified: tagAdmin.is_email_verified,
      };
    } else if (payload.role === UserRole.EMPLOYEE) {
      const employee = await this.employeeRepository.findOne({
        where: { employee_id: payload.sub },
      });

      if (!employee) {
        throw new UnauthorizedException();
      }

      return {
        sub: payload.sub,
        role: UserRole.EMPLOYEE,
        is_email_verified: employee.is_email_verified,
      };
    }

    throw new UnauthorizedException();
  }
}
