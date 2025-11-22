import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { ORGANIZATIONS_CONSTANTS } from '../../modules/organizations/organizations.constants';

@Injectable()
export class OrganizationOwnershipValidator {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async validateOwnership(
    organizationAdminId: number,
    organizationId: number,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { organization_id: organizationId },
      relations: ['organization_admin'],
    });

    if (!organization) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.ORGANIZATION_NOT_FOUND,
      );
    }

    if (
      organization.organization_admin.organization_admin_id !==
      organizationAdminId
    ) {
      throw new ForbiddenException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.ACCESS_DENIED,
      );
    }

    return organization;
  }
}
