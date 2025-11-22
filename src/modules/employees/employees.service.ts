import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { InviteToken } from '../global-admin/entities/invite-token.entity';
import { JoinOrganizationDto } from './dto/join-organization.dto';
import { JoinOrganizationResponseDto } from './dto/join-organization-response.dto';
import { InviteTokenType } from '../global-admin/enums/invite-token-type.enum';
import { InviteTokenService } from '../../shared/services/invite-token.service';
import { AUTH_CONSTANTS } from '../auth/auth.constants';
import { EMPLOYEES_CONSTANTS } from './employees.constants';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(InviteToken)
    private readonly inviteTokenRepository: Repository<InviteToken>,
    private readonly inviteTokenService: InviteTokenService,
  ) {}

  async joinOrganization(
    employeeId: number,
    joinDto: JoinOrganizationDto,
  ): Promise<JoinOrganizationResponseDto> {
    const inviteToken = await this.inviteTokenService.validateInviteToken(
      joinDto.token,
      InviteTokenType.EMPLOYEE_INVITE,
    );

    if (!inviteToken.organization) {
      throw new NotFoundException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
      );
    }

    const employee = await this.employeeRepository.findOne({
      where: { employee_id: employeeId },
      relations: ['organization'],
    });

    if (!employee) {
      throw new NotFoundException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    if (!employee.is_consent_given && !joinDto.consent_given) {
      throw new BadRequestException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.CONSENT_REQUIRED,
      );
    }

    if (!employee.is_consent_given) {
      employee.is_consent_given = true;
    }

    employee.organization = inviteToken.organization;
    await this.employeeRepository.save(employee);

    inviteToken.is_used = true;
    inviteToken.used_at = new Date();
    inviteToken.used_by_employee = employee;
    await this.inviteTokenRepository.save(inviteToken);

    return {
      organization_id: inviteToken.organization.organization_id,
    };
  }
}
