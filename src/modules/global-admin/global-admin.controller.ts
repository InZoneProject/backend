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
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GlobalAdminService } from './global-admin.service';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';
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
  @Roles(UserRole.GLOBAL_ADMIN)
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getInviteHistory(
    @Query('search') search?: string,
    @Query(
      'offset',
      new DefaultValuePipe(PAGINATION_CONSTANTS.DEFAULT_OFFSET),
      ParseIntPipe,
    )
    offset?: number,
    @Query(
      'limit',
      new DefaultValuePipe(PAGINATION_CONSTANTS.DEFAULT_LIMIT),
      ParseIntPipe,
    )
    limit?: number,
  ): Promise<InviteHistoryResponseDto> {
    return this.globalAdminService.getInviteHistory(search, offset, limit);
  }

  @Get('organization-admins')
  @Roles(UserRole.GLOBAL_ADMIN)
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllOrganizationAdmins(
    @Query('search') search?: string,
    @Query(
      'offset',
      new DefaultValuePipe(PAGINATION_CONSTANTS.DEFAULT_OFFSET),
      ParseIntPipe,
    )
    offset?: number,
    @Query(
      'limit',
      new DefaultValuePipe(PAGINATION_CONSTANTS.DEFAULT_LIMIT),
      ParseIntPipe,
    )
    limit?: number,
  ): Promise<OrganizationAdminListResponseDto> {
    return this.globalAdminService.getAllOrganizationAdmins(
      search,
      offset,
      limit,
    );
  }

  @Delete('organization-admins/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrganizationAdmin(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.globalAdminService.deleteOrganizationAdmin(id);
  }
}
