import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  Query,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GlobalAdminService } from './global-admin.service';
import { GLOBAL_ADMIN_CONSTANTS } from './global-admin.constants';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InviteHistoryResponseDto } from './dto/invite-history-response.dto';
import { OrganizationAdminListResponseDto } from './dto/organization-admin-list-response.dto';

@ApiTags('Global Admin')
@Controller('global-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GLOBAL_ADMIN)
@ApiBearerAuth('JWT-auth')
export class GlobalAdminController {
  constructor(private readonly globalAdminService: GlobalAdminService) {}

  @Post('invites')
  async generateInvite(): Promise<InviteResponseDto> {
    return this.globalAdminService.generateInviteToken();
  }

  @Get('invites/status')
  async getInviteStatus(): Promise<InviteResponseDto | null> {
    return this.globalAdminService.getValidInviteToken();
  }

  @Get('invites/history')
  async getInviteHistory(
    @Query(
      'offset',
      new DefaultValuePipe(GLOBAL_ADMIN_CONSTANTS.DEFAULT_PAGINATION_OFFSET),
      ParseIntPipe,
    )
    offset: number,
    @Query(
      'limit',
      new DefaultValuePipe(GLOBAL_ADMIN_CONSTANTS.DEFAULT_PAGINATION_LIMIT),
      ParseIntPipe,
    )
    limit: number,
  ): Promise<InviteHistoryResponseDto> {
    return this.globalAdminService.getInviteTokenHistory(offset, limit);
  }

  @Get('organization-admins')
  async getAllOrganizationAdmins(
    @Query(
      'offset',
      new DefaultValuePipe(GLOBAL_ADMIN_CONSTANTS.DEFAULT_PAGINATION_OFFSET),
      ParseIntPipe,
    )
    offset: number,
    @Query(
      'limit',
      new DefaultValuePipe(GLOBAL_ADMIN_CONSTANTS.DEFAULT_PAGINATION_LIMIT),
      ParseIntPipe,
    )
    limit: number,
  ): Promise<OrganizationAdminListResponseDto> {
    return this.globalAdminService.getAllOrganizationAdmins(offset, limit);
  }

  @Delete('organization-admins/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrganizationAdmin(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.globalAdminService.deleteOrganizationAdmin(id);
  }
}
