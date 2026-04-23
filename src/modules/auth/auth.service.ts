import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { GlobalAdmin } from '../global-admin/entities/global-admin.entity';
import { EncryptionUtil } from '../../shared/utils/encryption.util';
import { OrganizationAdmin } from '../organizations/entities/organization-admin.entity';
import { TagAdmin } from '../tag-admin/entities/tag-admin.entity';
import { Employee } from '../employees/entities/employee.entity';
import { InviteToken } from '../global-admin/entities/invite-token.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AUTH_CONSTANTS } from './auth.constants';
import { JwtPayload } from './types/jwt-payload.types';
import { InviteTokenPayload } from '../global-admin/types/invite-token-payload.types';
import { UserRole } from './enums/user-role.enum';
import { InviteTokenType } from '../global-admin/enums/invite-token-type.enum';
import { EmailService } from '../../shared/services/email.service';
import { COLUMN_LENGTHS } from '../../shared/constants/column-lengths';
import { randomBytes } from 'node:crypto';
import { PasswordReset } from './entities/password-reset.entity';
import { CRYPTO_CONSTANTS } from '../../shared/constants/crypto.constants';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly jwtSecret: string;
  private readonly encryptionKey: string;
  private readonly encryptionAlgorithm: string;

  constructor(
    @InjectRepository(GlobalAdmin)
    private globalAdminRepository: Repository<GlobalAdmin>,
    @InjectRepository(OrganizationAdmin)
    private organizationAdminRepository: Repository<OrganizationAdmin>,
    @InjectRepository(TagAdmin)
    private tagAdminRepository: Repository<TagAdmin>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(InviteToken)
    private inviteTokenRepository: Repository<InviteToken>,
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
  ) {
    this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.encryptionKey = this.configService.getOrThrow<string>(
      'INVITE_TOKEN_ENCRYPTION_KEY',
    );
    this.encryptionAlgorithm = this.configService.getOrThrow<string>(
      'ENCRYPTION_ALGORITHM',
    );
  }

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
      const hashedPassword = await this.hashPassword(password);
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
    const storedToken = await this.validateInviteToken(
      invite_token,
      InviteTokenType.ORGANIZATION_ADMIN_INVITE,
    );

    const existingAdmin = await this.organizationAdminRepository.findOne({
      where: { email },
    });

    if (existingAdmin) {
      throw new ConflictException(
        AUTH_CONSTANTS.ERROR_MESSAGES.EMAIL_ALREADY_IN_USE,
      );
    }

    const hashedPassword = await this.hashPassword(password);

    const newAdmin = await this.organizationAdminRepository.save({
      full_name,
      email,
      password: hashedPassword,
    });

    storedToken.is_used = true;
    storedToken.used_at = new Date();
    storedToken.used_by_organization_admin = newAdmin;
    await this.inviteTokenRepository.save(storedToken);

    await this.createAndSendVerificationCode(email, newAdmin);

    const tokenPayload: JwtPayload = {
      sub: newAdmin.organization_admin_id,
      role: UserRole.ORGANIZATION_ADMIN,
      is_email_verified: false,
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
      is_email_verified: admin.is_email_verified,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async registerTagAdmin(
    invite_token: string,
    full_name: string,
    email: string,
    password: string,
  ): Promise<AuthResponseDto> {
    const storedToken = await this.validateInviteToken(
      invite_token,
      InviteTokenType.TAG_ADMIN_INVITE,
    );

    if (!storedToken.organization) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
      );
    }

    const existingTagAdmin = await this.tagAdminRepository.findOne({
      where: { email },
    });

    if (existingTagAdmin) {
      throw new ConflictException(
        AUTH_CONSTANTS.ERROR_MESSAGES.EMAIL_ALREADY_IN_USE,
      );
    }

    const hashedPassword = await this.hashPassword(password);

    const newTagAdmin = await this.tagAdminRepository.save({
      full_name,
      email,
      password: hashedPassword,
      organization: storedToken.organization,
    });

    storedToken.is_used = true;
    storedToken.used_at = new Date();
    storedToken.used_by_tag_admin = newTagAdmin;
    await this.inviteTokenRepository.save(storedToken);

    await this.createAndSendVerificationCode(email, newTagAdmin);

    const tokenPayload: JwtPayload = {
      sub: newTagAdmin.tag_admin_id,
      role: UserRole.TAG_ADMIN,
      is_email_verified: false,
    };

    return {
      access_token: this.jwtService.sign(tokenPayload),
    };
  }

  async loginTagAdmin(
    email: string,
    password: string,
  ): Promise<AuthResponseDto> {
    const admin = await this.tagAdminRepository.findOne({
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
      sub: admin.tag_admin_id,
      role: UserRole.TAG_ADMIN,
      is_email_verified: admin.is_email_verified,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async registerEmployee(
    full_name: string,
    email: string,
    password: string,
  ): Promise<AuthResponseDto> {
    const existingEmployee = await this.employeeRepository.findOne({
      where: { email },
    });

    if (existingEmployee) {
      throw new ConflictException(
        AUTH_CONSTANTS.ERROR_MESSAGES.EMAIL_ALREADY_IN_USE,
      );
    }

    const hashedPassword = await this.hashPassword(password);

    const newEmployee = await this.employeeRepository.save({
      full_name,
      email,
      password: hashedPassword,
    });

    await this.createAndSendVerificationCode(email, newEmployee);

    const payload: JwtPayload = {
      sub: newEmployee.employee_id,
      role: UserRole.EMPLOYEE,
      is_email_verified: false,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async loginEmployee(
    email: string,
    password: string,
  ): Promise<AuthResponseDto> {
    const employee = await this.employeeRepository.findOne({
      where: { email },
    });

    if (!employee || !employee.password) {
      throw new UnauthorizedException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    }

    const payload: JwtPayload = {
      sub: employee.employee_id,
      role: UserRole.EMPLOYEE,
      is_email_verified: employee.is_email_verified,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async verifyEmail(
    userId: number,
    role: UserRole,
    code: string,
  ): Promise<boolean> {
    const user = await this.getUserByRole(userId, role);

    if (!user) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    }

    if (user.is_email_verified) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED,
      );
    }

    const verification = await this.getVerificationByUserAndRole(
      userId,
      role,
      code,
    );

    if (!verification) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_VERIFICATION_CODE,
      );
    }

    if (verification.expires_at < new Date()) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.VERIFICATION_CODE_EXPIRED,
      );
    }

    user.is_email_verified = true;
    await this.saveUserByRole(user, role);
    await this.emailVerificationRepository.remove(verification);

    return true;
  }

  async resendVerificationCode(userId: number, role: UserRole): Promise<void> {
    const user = await this.getUserByRole(userId, role);

    if (!user) {
      throw new NotFoundException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    }

    if (user.is_email_verified) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED,
      );
    }

    const existingVerification = await this.getVerificationByUserAndRole(
      userId,
      role,
    );

    if (existingVerification) {
      const timeSinceLastCode =
        Date.now() - existingVerification.created_at.getTime();
      if (timeSinceLastCode < AUTH_CONSTANTS.VERIFICATION_CODE_EXPIRES_IN_MS) {
        throw new BadRequestException(
          AUTH_CONSTANTS.ERROR_MESSAGES.VERIFICATION_CODE_ALREADY_SENT,
        );
      }
    }

    await this.createAndSendVerificationCode(user.email, user);
  }

  async getVerificationStatus(
    userId: number,
    role: UserRole,
  ): Promise<{
    is_verified: boolean;
    created_at?: Date;
    expires_at?: Date;
  }> {
    const user = await this.getUserByRole(userId, role);
    const isVerified = user?.is_email_verified || false;

    if (isVerified) {
      return { is_verified: true };
    }

    const verification = user
      ? await this.getVerificationByUserAndRole(userId, role)
      : null;

    const now = new Date();

    if (!verification || now > verification.expires_at) {
      return { is_verified: false };
    }

    return {
      is_verified: false,
      created_at: verification.created_at,
      expires_at: verification.expires_at,
    };
  }

  private async createAndSendVerificationCode(
    email: string,
    user: OrganizationAdmin | TagAdmin | Employee,
  ): Promise<void> {
    const code = this.generateVerificationCode();
    const expiresAt = new Date(
      Date.now() + AUTH_CONSTANTS.VERIFICATION_CODE_EXPIRES_IN_MS,
    );

    const existingVerifications = await this.emailVerificationRepository.find({
      where: [
        {
          organization_admin: {
            organization_admin_id: (user as OrganizationAdmin)
              .organization_admin_id,
          },
        },
        { tag_admin: { tag_admin_id: (user as TagAdmin).tag_admin_id } },
        { employee: { employee_id: (user as Employee).employee_id } },
      ],
    });

    await this.emailVerificationRepository.remove(existingVerifications);

    const verification = new EmailVerification();
    verification.code = code;
    verification.expires_at = expiresAt;

    if ('organization_admin_id' in user) {
      verification.organization_admin = user;
    } else if ('tag_admin_id' in user) {
      verification.tag_admin = user;
    } else if ('employee_id' in user) {
      verification.employee = user;
    }

    await this.emailVerificationRepository.save(verification);
    await this.emailService.sendVerificationCode(email, code);
  }

  private generateVerificationCode(): string {
    const length = COLUMN_LENGTHS.VERIFICATION_CODE;
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, AUTH_CONSTANTS.BCRYPT_ROUNDS);
  }

  private async getUserByRole(
    userId: number,
    role: UserRole,
  ): Promise<OrganizationAdmin | TagAdmin | Employee | null> {
    switch (role) {
      case UserRole.ORGANIZATION_ADMIN:
        return this.organizationAdminRepository.findOne({
          where: { organization_admin_id: userId },
        });
      case UserRole.TAG_ADMIN:
        return this.tagAdminRepository.findOne({
          where: { tag_admin_id: userId },
        });
      case UserRole.EMPLOYEE:
        return this.employeeRepository.findOne({
          where: { employee_id: userId },
        });
      default:
        return null;
    }
  }

  private async getVerificationByUserAndRole(
    userId: number,
    role: UserRole,
    code?: string,
  ): Promise<EmailVerification | null> {
    const baseWhere = code ? { code } : {};

    switch (role) {
      case UserRole.ORGANIZATION_ADMIN:
        return this.emailVerificationRepository.findOne({
          where: {
            ...baseWhere,
            organization_admin: { organization_admin_id: userId },
          },
          order: { created_at: 'DESC' },
        });
      case UserRole.TAG_ADMIN:
        return this.emailVerificationRepository.findOne({
          where: {
            ...baseWhere,
            tag_admin: { tag_admin_id: userId },
          },
          order: { created_at: 'DESC' },
        });
      case UserRole.EMPLOYEE:
        return this.emailVerificationRepository.findOne({
          where: {
            ...baseWhere,
            employee: { employee_id: userId },
          },
          order: { created_at: 'DESC' },
        });
      default:
        return null;
    }
  }

  private async saveUserByRole(
    user: OrganizationAdmin | TagAdmin | Employee,
    role: UserRole,
  ): Promise<void> {
    switch (role) {
      case UserRole.ORGANIZATION_ADMIN:
        await this.organizationAdminRepository.save(user);
        break;
      case UserRole.TAG_ADMIN:
        await this.tagAdminRepository.save(user);
        break;
      case UserRole.EMPLOYEE:
        await this.employeeRepository.save(user);
        break;
    }
  }

  private async validateInviteToken(
    inviteToken: string,
    expectedType: InviteTokenType,
  ): Promise<InviteToken> {
    let payload: InviteTokenPayload;
    try {
      payload = this.jwtService.verify<InviteTokenPayload>(inviteToken, {
        secret: this.jwtSecret,
      });
    } catch {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
      );
    }

    if (payload.type !== expectedType) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
      );
    }

    const allActiveTokens = await this.inviteTokenRepository.find({
      where: {
        is_used: false,
      },
      relations: [
        'used_by_organization_admin',
        'used_by_tag_admin',
        'organization',
      ],
    });

    let storedToken: InviteToken | null = null;
    for (const token of allActiveTokens) {
      const decrypted = EncryptionUtil.decrypt(
        token.token_encrypted,
        this.encryptionKey,
        this.encryptionAlgorithm,
      );
      if (decrypted === inviteToken) {
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

    return storedToken;
  }

  async sendEmployeeResetPasswordLink(email: string): Promise<void> {
    const employee = await this.employeeRepository.findOne({
      where: { email },
    });

    if (!employee) {
      throw new NotFoundException(
        AUTH_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    const rawToken = await this.createEmployeePasswordResetRecord(employee);
    await this.emailService.sendPasswordResetLink(email, rawToken);
  }

  async sendOrganizationAdminResetPasswordLink(email: string): Promise<void> {
    const organizationAdmin = await this.organizationAdminRepository.findOne({
      where: { email },
    });

    if (!organizationAdmin) {
      throw new NotFoundException(
        AUTH_CONSTANTS.ERROR_MESSAGES.ORGANIZATION_ADMIN_NOT_FOUND,
      );
    }

    const rawToken =
      await this.createOrganizationAdminPasswordResetRecord(organizationAdmin);
    await this.emailService.sendPasswordResetLink(email, rawToken);
  }

  async sendTagAdminResetPasswordLink(email: string): Promise<void> {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { email },
    });

    if (!tagAdmin) {
      throw new NotFoundException(
        AUTH_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    const rawToken = await this.createTagAdminPasswordResetRecord(tagAdmin);
    await this.emailService.sendPasswordResetLink(email, rawToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const validReset = await this.findPasswordResetByToken(token);

    if (!validReset || validReset.expires_at < new Date()) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_RESET_TOKEN,
      );
    }

    const passwordHashed = await bcrypt.hash(
      newPassword,
      AUTH_CONSTANTS.BCRYPT_ROUNDS,
    );

    if (validReset.organization_admin) {
      await this.ensurePasswordIsDifferent(
        validReset.organization_admin.password,
        newPassword,
      );
      validReset.organization_admin.password = passwordHashed;
      await this.organizationAdminRepository.save(
        validReset.organization_admin,
      );
      await this.passwordResetRepository.remove(validReset);
      return;
    }

    if (validReset.tag_admin) {
      await this.ensurePasswordIsDifferent(
        validReset.tag_admin.password,
        newPassword,
      );
      validReset.tag_admin.password = passwordHashed;
      await this.tagAdminRepository.save(validReset.tag_admin);
      await this.passwordResetRepository.remove(validReset);
      return;
    }

    if (validReset.employee) {
      await this.ensurePasswordIsDifferent(
        validReset.employee.password,
        newPassword,
      );
      validReset.employee.password = passwordHashed;
      await this.employeeRepository.save(validReset.employee);
      await this.passwordResetRepository.remove(validReset);
      return;
    }

    throw new BadRequestException(
      AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_RESET_TOKEN,
    );
  }

  private async createEmployeePasswordResetRecord(
    employee: Employee,
  ): Promise<string> {
    const existingReset = await this.passwordResetRepository.findOne({
      where: {
        employee: { employee_id: employee.employee_id },
      },
      order: { created_at: 'DESC' },
    });
    await this.ensureNoActivePasswordReset(existingReset);

    const reset = new PasswordReset();
    reset.employee = employee;
    reset.organization_admin = null;
    reset.tag_admin = null;
    return this.createPasswordResetRecord(reset);
  }

  private async createOrganizationAdminPasswordResetRecord(
    organizationAdmin: OrganizationAdmin,
  ): Promise<string> {
    const existingReset = await this.passwordResetRepository.findOne({
      where: {
        organization_admin: {
          organization_admin_id: organizationAdmin.organization_admin_id,
        },
      },
      order: { created_at: 'DESC' },
    });
    await this.ensureNoActivePasswordReset(existingReset);

    const reset = new PasswordReset();
    reset.organization_admin = organizationAdmin;
    reset.tag_admin = null;
    reset.employee = null;
    return this.createPasswordResetRecord(reset);
  }

  private async createTagAdminPasswordResetRecord(
    tagAdmin: TagAdmin,
  ): Promise<string> {
    const existingReset = await this.passwordResetRepository.findOne({
      where: {
        tag_admin: { tag_admin_id: tagAdmin.tag_admin_id },
      },
      order: { created_at: 'DESC' },
    });
    await this.ensureNoActivePasswordReset(existingReset);

    const reset = new PasswordReset();
    reset.organization_admin = null;
    reset.tag_admin = tagAdmin;
    reset.employee = null;
    return this.createPasswordResetRecord(reset);
  }

  private async ensureNoActivePasswordReset(
    existingReset: PasswordReset | null,
  ): Promise<void> {
    if (!existingReset) {
      return;
    }

    if (existingReset.expires_at > new Date()) {
      throw new BadRequestException({
        message:
          AUTH_CONSTANTS.ERROR_MESSAGES.PASSWORD_RESET_LINK_ALREADY_ACTIVE,
        created_at: existingReset.created_at,
        expires_at: existingReset.expires_at,
      });
    }

    await this.passwordResetRepository.remove(existingReset);
  }

  private async createPasswordResetRecord(
    reset: PasswordReset,
  ): Promise<string> {
    const rawToken = randomBytes(CRYPTO_CONSTANTS.TOKEN_BYTES).toString(
      CRYPTO_CONSTANTS.TOKEN_ENCODING,
    );

    reset.token_hashed = await bcrypt.hash(
      rawToken,
      AUTH_CONSTANTS.BCRYPT_ROUNDS,
    );
    reset.expires_at = new Date(
      Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_EXPIRES_IN_MS,
    );

    await this.passwordResetRepository.save(reset);

    return rawToken;
  }

  private async findPasswordResetByToken(
    token: string,
  ): Promise<PasswordReset | null> {
    const resets = await this.passwordResetRepository.find({
      relations: ['organization_admin', 'tag_admin', 'employee'],
    });
    return this.matchPasswordResetToken(token, resets);
  }

  private async matchPasswordResetToken(
    token: string,
    resets: PasswordReset[],
  ): Promise<PasswordReset | null> {
    for (const record of resets) {
      const isMatch = await bcrypt.compare(token, record.token_hashed);
      if (isMatch) {
        return record;
      }
    }

    return null;
  }

  private async ensurePasswordIsDifferent(
    currentPasswordHashed: string | null | undefined,
    newPassword: string,
  ): Promise<void> {
    if (!currentPasswordHashed) {
      return;
    }

    const isSameAsCurrent = await bcrypt.compare(
      newPassword,
      currentPasswordHashed,
    );

    if (isSameAsCurrent) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.PASSWORD_SAME_AS_CURRENT,
      );
    }
  }
}
