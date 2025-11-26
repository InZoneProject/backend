import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Param,
  UseInterceptors,
  UploadedFile,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiBody,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmployeesService } from './employees.service';
import { JoinOrganizationDto } from './dto/join-organization.dto';
import { UpdateProfilePhotoDto } from '../../shared/dto/update-profile-photo.dto';
import { UpdateProfileInfoDto } from '../../shared/dto/update-profile-info.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailVerificationGuard } from '../auth/guards/email-verification.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';
import type { RequestWithUser } from '../auth/types/request-with-user.types';

@ApiTags('Employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post('join')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: JoinOrganizationDto })
  async joinOrganization(
    @Body() joinDto: JoinOrganizationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employeesService.joinOrganization(req.user.sub, joinDto);
  }

  @Patch('profile/photo')
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
  @Roles(UserRole.EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateProfilePhotoDto })
  @UseInterceptors(FileInterceptor('photo'))
  async updateProfilePhoto(
    @UploadedFile() photo: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return this.employeesService.updateProfilePhoto(req.user.sub, photo);
  }

  @Patch('profile/info')
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
  @Roles(UserRole.EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  async updateProfileInfo(
    @Body() updateInfoDto: UpdateProfileInfoDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employeesService.updateProfileInfo(req.user.sub, updateInfoDto);
  }

  @Get('organizations')
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
  @Roles(UserRole.EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({ name: 'search', required: false })
  async getOrganizations(
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
    return this.employeesService.getOrganizations(
      req.user.sub,
      offset,
      limit,
      search,
    );
  }

  @Get('organization/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
  @Roles(UserRole.EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  async getOrganizationInfo(
    @Param('id', ParseIntPipe) organizationId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.employeesService.getOrganizationInfo(
      req.user.sub,
      organizationId,
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
  @Roles(UserRole.EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  async getProfile(@Req() req: RequestWithUser) {
    return this.employeesService.getProfile(req.user.sub);
  }

  @Delete('profile')
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
  @Roles(UserRole.EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@Req() req: RequestWithUser): Promise<void> {
    await this.employeesService.deleteProfile(req.user.sub);
  }

  @Delete('organization/:id/leave')
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
  @Roles(UserRole.EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveOrganization(
    @Param('id', ParseIntPipe) organizationId: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.employeesService.leaveOrganization(req.user.sub, organizationId);
  }

  @Get('organization/:id/members')
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
  @Roles(UserRole.EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
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
    return this.employeesService.getOrganizationMembers(
      req.user.sub,
      organizationId,
      search,
      offset,
      limit,
    );
  }
}
