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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RfidService } from './rfid.service';
import { OrganizationIdDto } from '../../shared/dto/organization-id.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailVerificationGuard } from '../auth/guards/email-verification.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { RequestWithUser } from '../auth/types/request-with-user.types';

@ApiTags('RFID')
@Controller('rfid')
@UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
@ApiBearerAuth('JWT-auth')
export class RfidController {
  constructor(private readonly rfidService: RfidService) {}

  @Post('readers')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async createRfidReader(
    @Body() createRfidReaderDto: OrganizationIdDto,
    @Req() req: RequestWithUser,
  ) {
    const { rfid_reader, plain_token } =
      await this.rfidService.createRfidReader(
        req.user.sub,
        createRfidReaderDto,
      );
    return {
      rfid_reader_id: rfid_reader.rfid_reader_id,
      secret_token: plain_token,
      created_at: rfid_reader.created_at,
    };
  }

  @Post('tags')
  @Roles(UserRole.TAG_ADMIN, UserRole.ORGANIZATION_ADMIN)
  async createRfidTag(
    @Body() createRfidTagDto: OrganizationIdDto,
    @Req() req: RequestWithUser,
  ) {
    return this.rfidService.createRfidTag(req.user.sub, createRfidTagDto);
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
    await this.rfidService.deleteRfidTag(req.user.sub, tagId);
  }
}
