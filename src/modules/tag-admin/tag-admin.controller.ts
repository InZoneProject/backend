import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Req,
  Get,
  UseInterceptors,
  UploadedFile,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TagAdminService } from './tag-admin.service';
import { AssignTagToEmployeeDto } from './dto/assign-tag-to-employee.dto';
import { UpdateProfilePhotoDto } from '../../shared/dto/update-profile-photo.dto';
import { UpdateProfileInfoDto } from '../../shared/dto/update-profile-info.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailVerificationGuard } from '../auth/guards/email-verification.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { RequestWithUser } from '../auth/types/request-with-user.types';

@ApiTags('Tag Admin')
@Controller('tag-admin')
@UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
@Roles(UserRole.TAG_ADMIN)
@ApiBearerAuth('JWT-auth')
export class TagAdminController {
  constructor(private readonly tagAdminService: TagAdminService) {}

  @Patch('profile/photo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateProfilePhotoDto })
  @UseInterceptors(FileInterceptor('photo'))
  async updateProfilePhoto(
    @UploadedFile() photo: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return this.tagAdminService.updateProfilePhoto(req.user.sub, photo);
  }

  @Patch('profile/info')
  async updateProfileInfo(
    @Body() updateInfoDto: UpdateProfileInfoDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tagAdminService.updateProfileInfo(req.user.sub, updateInfoDto);
  }

  @Get('profile')
  async getProfile(@Req() req: RequestWithUser) {
    return this.tagAdminService.getProfile(req.user.sub);
  }

  @Delete('profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@Req() req: RequestWithUser): Promise<void> {
    await this.tagAdminService.deleteProfile(req.user.sub);
  }

  @Get('organization')
  async getOrganizationInfo(@Req() req: RequestWithUser) {
    return this.tagAdminService.getOrganizationInfo(req.user.sub);
  }

  @Post('tag-assignments')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBody({ type: AssignTagToEmployeeDto })
  async assignTagToEmployee(
    @Body() assignTagDto: AssignTagToEmployeeDto,
    @Req() req: RequestWithUser,
  ) {
    await this.tagAdminService.assignTagToEmployee(req.user.sub, assignTagDto);
  }

  @Delete('employees/:employeeId/tag')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTagFromEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Req() req: RequestWithUser,
  ) {
    await this.tagAdminService.removeTagFromEmployee(req.user.sub, employeeId);
  }

  @Get('employees')
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getEmployeesWithTags(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.tagAdminService.getEmployeesWithTags(
      req.user.sub,
      search,
      offset,
      limit,
    );
  }
}
