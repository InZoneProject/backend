import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AccessControlService } from './access-control.service';
import { CreateZoneAccessRuleDto } from './dto/create-zone-access-rule.dto';
import { UpdateZoneAccessRuleDto } from './dto/update-zone-access-rule.dto';
import { AttachRuleToZoneDto } from './dto/attach-rule-to-zone.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailVerificationGuard } from '../auth/guards/email-verification.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { RequestWithUser } from '../auth/types/request-with-user.types';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';

@ApiTags('Access Control')
@Controller('access-control')
@UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
@Roles(UserRole.ORGANIZATION_ADMIN)
@ApiBearerAuth('JWT-auth')
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Post('zone-access-rules')
  async createZoneAccessRule(
    @Body() createDto: CreateZoneAccessRuleDto,
    @Req() req: RequestWithUser,
  ) {
    return this.accessControlService.createZoneAccessRule(
      req.user.sub,
      createDto,
    );
  }

  @Get('zone-access-rules')
  async getAllRules(
    @Req() req: RequestWithUser,
    @Query('organization_id') organizationId?: number,
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
  ) {
    if (!organizationId) {
      throw new BadRequestException(
        'organization_id query parameter is required',
      );
    }
    return this.accessControlService.getAllRules(
      req.user.sub,
      +organizationId,
      offset,
      limit,
    );
  }

  @Patch('zone-access-rules/:id')
  async updateZoneAccessRule(
    @Param('id', ParseIntPipe) ruleId: number,
    @Body() updateDto: UpdateZoneAccessRuleDto,
    @Req() req: RequestWithUser,
  ) {
    return this.accessControlService.updateZoneAccessRule(
      req.user.sub,
      ruleId,
      updateDto,
    );
  }

  @Delete('zone-access-rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteZoneAccessRule(
    @Param('id', ParseIntPipe) ruleId: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.accessControlService.deleteZoneAccessRule(req.user.sub, ruleId);
  }

  @Get('zones/:zoneId/access-rules')
  async getZoneAccessRules(
    @Param('zoneId', ParseIntPipe) zoneId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.accessControlService.getZoneAccessRules(req.user.sub, zoneId);
  }

  @Post('zones/:zoneId/rules/:ruleId/attach')
  @HttpCode(HttpStatus.NO_CONTENT)
  async attachRuleToZone(
    @Param('zoneId', ParseIntPipe) zoneId: number,
    @Param('ruleId', ParseIntPipe) ruleId: number,
    @Body() attachDto: AttachRuleToZoneDto,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.accessControlService.attachRuleToZone(
      req.user.sub,
      ruleId,
      zoneId,
      attachDto,
    );
  }

  @Delete('zones/:zoneId/rules/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detachRuleFromZone(
    @Param('zoneId', ParseIntPipe) zoneId: number,
    @Param('ruleId', ParseIntPipe) ruleId: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.accessControlService.detachRuleFromZone(
      req.user.sub,
      ruleId,
      zoneId,
    );
  }

  @Post('zones/:zoneId/rules/:ruleId/positions/:positionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async attachPositionToZoneRule(
    @Param('zoneId', ParseIntPipe) zoneId: number,
    @Param('ruleId', ParseIntPipe) ruleId: number,
    @Param('positionId', ParseIntPipe) positionId: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.accessControlService.attachPositionToZoneRule(
      req.user.sub,
      zoneId,
      ruleId,
      positionId,
    );
  }

  @Delete('zones/:zoneId/rules/:ruleId/positions/:positionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detachPositionFromZoneRule(
    @Param('zoneId', ParseIntPipe) zoneId: number,
    @Param('ruleId', ParseIntPipe) ruleId: number,
    @Param('positionId', ParseIntPipe) positionId: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.accessControlService.detachPositionFromZoneRule(
      req.user.sub,
      zoneId,
      ruleId,
      positionId,
    );
  }
}
