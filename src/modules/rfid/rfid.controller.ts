import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Delete,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Patch,
  Get,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RfidService } from './rfid.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailVerificationGuard } from '../auth/guards/email-verification.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { RequestWithUser } from '../auth/types/request-with-user.types';
import { CreateRfidTagDto } from './dto/create-rfid-tag.dto';
import { CreateRfidReaderDto } from './dto/create-rfid-reader.dto';
import { UpdateRfidTagDto } from './dto/update-rfid-tag.dto';
import { UpdateRfidReaderDto } from './dto/update-rfid-reader.dto';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';

@ApiTags('RFID')
@Controller('rfid')
@UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
@ApiBearerAuth('JWT-auth')
export class RfidController {
  constructor(private readonly rfidService: RfidService) {}

  @Post('readers')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async createRfidReader(
    @Body() createRfidReaderDto: CreateRfidReaderDto,
    @Req() req: RequestWithUser,
  ) {
    const { rfid_reader, plain_token } =
      await this.rfidService.createRfidReader(
        req.user.sub,
        createRfidReaderDto,
      );
    return {
      rfid_reader_id: rfid_reader.rfid_reader_id,
      name: rfid_reader.name,
      secret_token: plain_token,
      created_at: rfid_reader.created_at,
    };
  }

  @Post('doors/:doorId/readers')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async createRfidReaderForDoor(
    @Param('doorId', ParseIntPipe) doorId: number,
    @Body() createRfidReaderDto: UpdateRfidReaderDto,
    @Req() req: RequestWithUser,
  ) {
    const { rfid_reader, plain_token } =
      await this.rfidService.createRfidReaderForDoor(
        req.user.sub,
        doorId,
        createRfidReaderDto.name,
      );

    return {
      rfid_reader_id: rfid_reader.rfid_reader_id,
      name: rfid_reader.name,
      secret_token: plain_token,
      created_at: rfid_reader.created_at,
    };
  }

  @Post('tags')
  @Roles(UserRole.TAG_ADMIN, UserRole.ORGANIZATION_ADMIN)
  async createRfidTag(
    @Body() createRfidTagDto: CreateRfidTagDto,
    @Req() req: RequestWithUser,
  ) {
    return this.rfidService.createRfidTag(
      req.user.sub,
      req.user.role,
      createRfidTagDto,
    );
  }

  @Delete('readers/:id')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRfidReader(
    @Param('id', ParseIntPipe) readerId: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.rfidService.deleteRfidReader(req.user.sub, readerId);
  }

  @Delete('tags/:id')
  @Roles(UserRole.TAG_ADMIN, UserRole.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRfidTag(
    @Param('id', ParseIntPipe) tagId: number,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.rfidService.deleteRfidTag(req.user.sub, req.user.role, tagId);
  }

  @Patch('tags/:id')
  @Roles(UserRole.TAG_ADMIN, UserRole.ORGANIZATION_ADMIN)
  async updateRfidTag(
    @Param('id', ParseIntPipe) tagId: number,
    @Body() updateRfidTagDto: UpdateRfidTagDto,
    @Req() req: RequestWithUser,
  ) {
    return this.rfidService.updateRfidTag(
      req.user.sub,
      req.user.role,
      tagId,
      updateRfidTagDto,
    );
  }

  @Get('organizations/:organizationId/employees/:employeeId/tag')
  @Roles(UserRole.TAG_ADMIN, UserRole.ORGANIZATION_ADMIN)
  async getAssignedTagForEmployee(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.rfidService.getAssignedTagForEmployee(
      req.user.sub,
      req.user.role,
      employeeId,
      organizationId,
    );
  }

  @Get('organizations/:organizationId/employees/:employeeId/available-tags')
  @Roles(UserRole.TAG_ADMIN, UserRole.ORGANIZATION_ADMIN)
  async getAvailableTagsForEmployee(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Req() req: RequestWithUser,
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
    @Query('search') search?: string,
  ) {
    return this.rfidService.getAvailableTagsForEmployee(
      req.user.sub,
      req.user.role,
      employeeId,
      organizationId,
      offset,
      limit,
      search,
    );
  }

  @Patch('readers/:id')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async updateRfidReader(
    @Param('id', ParseIntPipe) readerId: number,
    @Body() updateRfidReaderDto: UpdateRfidReaderDto,
    @Req() req: RequestWithUser,
  ) {
    return this.rfidService.updateRfidReader(
      req.user.sub,
      readerId,
      updateRfidReaderDto,
    );
  }

  @Get('doors/:doorId/reader')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getDoorReader(
    @Param('doorId', ParseIntPipe) doorId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.rfidService.getDoorReader(req.user.sub, doorId);
  }

  @Get('doors/:doorId/available-readers')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getAvailableReadersForDoor(
    @Param('doorId', ParseIntPipe) doorId: number,
    @Req() req: RequestWithUser,
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
    @Query('search') search?: string,
  ) {
    return this.rfidService.getAvailableReadersForDoor(
      req.user.sub,
      doorId,
      offset,
      limit,
      search,
    );
  }

  @Patch('readers/:id/token')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async regenerateReaderToken(
    @Param('id', ParseIntPipe) readerId: number,
    @Req() req: RequestWithUser,
  ) {
    const { rfid_reader, plain_token } =
      await this.rfidService.regenerateReaderToken(req.user.sub, readerId);

    return {
      rfid_reader_id: rfid_reader.rfid_reader_id,
      new_secret_token: plain_token,
    };
  }
}
