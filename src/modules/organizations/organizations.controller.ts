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
  Patch,
  UseInterceptors,
  UploadedFile,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrganizationsService } from './organizations.service';
import { OrganizationRequest } from './dto/organization-request.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { UpdateProfilePhotoDto } from '../../shared/dto/update-profile-photo.dto';
import { UpdateProfileInfoDto } from '../../shared/dto/update-profile-info.dto';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailVerificationGuard } from '../auth/guards/email-verification.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { OrganizationMemberRole } from '../../shared/enums/organization-member-role.enum';
import type { RequestWithUser } from '../auth/types/request-with-user.types';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
@ApiBearerAuth('JWT-auth')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiQuery({ name: 'search', required: false })
  @Roles(UserRole.ORGANIZATION_ADMIN)
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
    @Query('search') search: string,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.getOrganizations(
      req.user.sub,
      offset,
      limit,
      search,
    );
  }

  @Post()
  @Roles(UserRole.ORGANIZATION_ADMIN)
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
  @Roles(UserRole.ORGANIZATION_ADMIN)
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
  @Roles(UserRole.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.organizationsService.deleteOrganization(req.user.sub, id);
  }

  @Post(':id/tag-admin-invite')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async generateTagAdminInvite(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.generateTagAdminInvite(req.user.sub, id);
  }

  @Post(':id/employee-invite')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async generateEmployeeInvite(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.generateEmployeeInvite(req.user.sub, id);
  }

  @Get(':id/tag-admin-invite-status')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getTagAdminInviteStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.getTagAdminInviteStatus(req.user.sub, id);
  }

  @Get(':id/employee-invite-status')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getEmployeeInviteStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.getEmployeeInviteStatus(req.user.sub, id);
  }

  @Post('positions')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async createPosition(
    @Body() createPositionDto: CreatePositionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.createPosition(
      req.user.sub,
      createPositionDto,
    );
  }

  @Patch('positions/:id')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async updatePosition(
    @Param('id', ParseIntPipe) positionId: number,
    @Body() updatePositionDto: UpdatePositionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.updatePosition(
      req.user.sub,
      positionId,
      updatePositionDto,
    );
  }

  @Delete('positions/:id')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePosition(
    @Param('id', ParseIntPipe) positionId: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.organizationsService.deletePosition(req.user.sub, positionId);
  }

  @Patch('profile/photo')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateProfilePhotoDto })
  @UseInterceptors(FileInterceptor('photo'))
  async updateProfilePhoto(
    @UploadedFile() photo: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.updateAdminProfilePhoto(
      req.user.sub,
      photo,
    );
  }

  @Patch('profile/info')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async updateProfileInfo(
    @Body() updateInfoDto: UpdateProfileInfoDto,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.updateAdminProfileInfo(
      req.user.sub,
      updateInfoDto,
    );
  }

  @Get(':id/info')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getOrganizationInfo(
    @Param('id', ParseIntPipe) organizationId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.getOrganizationInfo(
      req.user.sub,
      organizationId,
    );
  }

  @Get(':id/buildings')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getBuildingsList(
    @Param('id', ParseIntPipe) organizationId: number,
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
    return this.organizationsService.getBuildingsList(
      req.user.sub,
      organizationId,
      offset,
      limit,
    );
  }

  @Get(':id/positions')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getPositionsList(
    @Param('id', ParseIntPipe) organizationId: number,
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
    return this.organizationsService.getPositionsList(
      req.user.sub,
      organizationId,
      offset,
      limit,
    );
  }

  @Get(':id/rfid-tags')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getRfidTagsList(
    @Param('id', ParseIntPipe) organizationId: number,
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
    return this.organizationsService.getRfidTagsList(
      req.user.sub,
      organizationId,
      offset,
      limit,
    );
  }

  @Get(':id/rfid-readers')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getRfidReadersList(
    @Param('id', ParseIntPipe) organizationId: number,
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
    return this.organizationsService.getRfidReadersList(
      req.user.sub,
      organizationId,
      offset,
      limit,
    );
  }

  @Post('employees/:employeeId/positions/:positionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async assignPositionToEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Param('positionId', ParseIntPipe) positionId: number,
    @Req() req: RequestWithUser,
  ) {
    await this.organizationsService.assignPositionToEmployee(
      req.user.sub,
      employeeId,
      positionId,
    );
  }

  @Delete('employees/:employeeId/positions/:positionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async removePositionFromEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Param('positionId', ParseIntPipe) positionId: number,
    @Req() req: RequestWithUser,
  ) {
    await this.organizationsService.removePositionFromEmployee(
      req.user.sub,
      employeeId,
      positionId,
    );
  }

  @Get('profile')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getProfile(@Req() req: RequestWithUser) {
    return this.organizationsService.getProfile(req.user.sub);
  }

  @Delete('profile')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@Req() req: RequestWithUser): Promise<void> {
    await this.organizationsService.deleteProfile(req.user.sub);
  }

  @Get(':id/members')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getOrganizationMembers(
    @Param('id', ParseIntPipe) organizationId: number,
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.organizationsService.getOrganizationMembers(
      req.user.sub,
      organizationId,
      search,
      offset,
      limit,
    );
  }

  @Get(':organizationId/members/:memberId/:role')
  @Roles(UserRole.ORGANIZATION_ADMIN, UserRole.TAG_ADMIN, UserRole.EMPLOYEE)
  async getMemberProfile(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Param('role', new ParseEnumPipe(OrganizationMemberRole))
    role: OrganizationMemberRole,
    @Req() req: RequestWithUser,
  ) {
    return this.organizationsService.getMemberProfile(
      req.user.sub,
      req.user.role,
      organizationId,
      memberId,
      role,
    );
  }

  @Delete(':id/tag-admins/:tagAdminId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async removeTagAdmin(
    @Param('id', ParseIntPipe) organizationId: number,
    @Param('tagAdminId', ParseIntPipe) tagAdminId: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.organizationsService.removeTagAdmin(
      req.user.sub,
      organizationId,
      tagAdminId,
    );
  }

  @Delete(':id/employees/:employeeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async removeEmployee(
    @Param('id', ParseIntPipe) organizationId: number,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.organizationsService.removeEmployee(
      req.user.sub,
      organizationId,
      employeeId,
    );
  }
}
