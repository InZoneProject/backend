import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { GlobalAdmin } from '../global-admin/entities/global-admin.entity';
import { EncryptionUtil } from '../../shared/utils/encryption.util';
import { OrganizationAdmin } from '../organizations/entities/organization-admin.entity';
import { InviteToken } from '../global-admin/entities/invite-token.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AUTH_CONSTANTS } from './auth.constants';
import { JwtPayload } from './types/jwt-payload.types';
import { InviteTokenPayload } from '../global-admin/types/invite-token-payload.types';
import { UserRole } from './enums/user-role.enum';
import { InviteTokenType } from '../global-admin/enums/invite-token-type.enum';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(GlobalAdmin)
    private globalAdminRepository: Repository<GlobalAdmin>,
    @InjectRepository(OrganizationAdmin)
    private organizationAdminRepository: Repository<OrganizationAdmin>,
    @InjectRepository(InviteToken)
    private inviteTokenRepository: Repository<InviteToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureGlobalAdminExists();
  }

  async ensureGlobalAdminExists() {
    const email = this.configService.get<string>('GLOBAL_ADMIN_EMAIL');
    const password = this.configService.get<string>('GLOBAL_ADMIN_PASSWORD');

    if (!email || !password) {
      throw new Error(AUTH_CONSTANTS.ERROR_MESSAGES.MISSING_ENV_VARIABLES);
    }

    const existingAdmin = await this.globalAdminRepository.findOne({
      where: { email },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(
        password,
        AUTH_CONSTANTS.BCRYPT_ROUNDS,
      );
      await this.globalAdminRepository.save({
        email,
        password: hashedPassword,
      });
    }
  }

  async loginGlobalAdmin(
    email: string,
    password: string,
  ): Promise<AuthResponseDto> {
    const admin = await this.globalAdminRepository.findOne({
      where: { email },
    });

    if (!admin) {
      throw new UnauthorizedException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    }

    const payload: JwtPayload = {
      sub: admin.global_admin_id,
      role: UserRole.GLOBAL_ADMIN,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async registerOrganizationAdmin(
    invite_token: string,
    full_name: string,
    email: string,
    password: string,
  ): Promise<AuthResponseDto> {
    let payload: InviteTokenPayload;
    try {
      payload = this.jwtService.verify<InviteTokenPayload>(invite_token);
    } catch {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
      );
    }

    if (payload.type !== InviteTokenType.ORGANIZATION_ADMIN_INVITE) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
      );
    }

    const key = this.configService.getOrThrow<string>(
      'INVITE_TOKEN_ENCRYPTION_KEY',
    );
    const algorithm = this.configService.getOrThrow<string>(
      'ENCRYPTION_ALGORITHM',
    );

    const allActiveTokens = await this.inviteTokenRepository.find({
      where: {
        is_used: false,
      },
      relations: ['used_by'],
    });

    let storedToken: InviteToken | null = null;
    for (const token of allActiveTokens) {
      const decrypted = EncryptionUtil.decrypt(
        token.token_encrypted,
        key,
        algorithm,
      );
      if (decrypted === invite_token) {
        storedToken = token;
        break;
      }
    }

    if (!storedToken) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
      );
    }

    if (storedToken.is_used) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVITE_TOKEN_ALREADY_USED,
      );
    }

    if (storedToken.expires_at < new Date()) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
      );
    }

    const existingAdmin = await this.organizationAdminRepository.findOne({
      where: { email },
    });

    if (existingAdmin) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(
      password,
      AUTH_CONSTANTS.BCRYPT_ROUNDS,
    );

    const newAdmin = await this.organizationAdminRepository.save({
      full_name,
      email,
      password: hashedPassword,
    });

    storedToken.is_used = true;
    storedToken.used_at = new Date();
    storedToken.used_by = newAdmin;
    await this.inviteTokenRepository.save(storedToken);

    const tokenPayload: JwtPayload = {
      sub: newAdmin.organization_admin_id,
      role: UserRole.ORGANIZATION_ADMIN,
    };

    return {
      access_token: this.jwtService.sign(tokenPayload),
    };
  }

  async loginOrganizationAdmin(
    email: string,
    password: string,
  ): Promise<AuthResponseDto> {
    const admin = await this.organizationAdminRepository.findOne({
      where: { email },
    });

    if (!admin) {
      throw new UnauthorizedException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    }

    const payload: JwtPayload = {
      sub: admin.organization_admin_id,
      role: UserRole.ORGANIZATION_ADMIN,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
