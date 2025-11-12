import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Get,
  Query,
  DefaultValuePipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { OrganizationRequest } from './dto/organization-request.dto';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailVerificationGuard } from '../auth/guards/email-verification.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { RequestWithUser } from '../auth/types/request-with-user.types';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
@Roles(UserRole.ORGANIZATION_ADMIN)
@ApiBearerAuth('JWT-auth')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async getAll(
    @Query(
      'offset',
      new DefaultValuePipe(PAGINATION_CONSTANTS.DEFAULT_OFFSET),
      ParseIntPipe,
    )
    offset: number,
    @Query(
      'limit',
      new DefaultValuePipe(PAGINATION_CONSTANTS.DEFAULT_LIMIT),
      ParseIntPipe,
    )
    limit: number,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.getOrganizations(
      req.user.sub,
      offset,
      limit,
    );
  }

  @Post()
  async create(
    @Body() createOrganizationDto: OrganizationRequest,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.createOrganization(
      req.user.sub,
      createOrganizationDto,
    );
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrganizationDto: OrganizationRequest,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.updateOrganization(
      req.user.sub,
      id,
      updateOrganizationDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.organizationsService.deleteOrganization(req.user.sub, id);
  }

  @Post(':id/tag-admin-invite')
  async generateTagAdminInvite(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.generateTagAdminInvite(req.user.sub, id);
  }
}
