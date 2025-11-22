import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  ParseIntPipe,
  Patch,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BuildingsService } from './buildings.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { CreateZoneWithPhotoDto } from './dto/create-zone-with-photo.dto';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { CreateEntranceDoorDto } from './dto/create-entrance-door.dto';
import { CreateDoorDto } from './dto/create-door.dto';
import { UpdateZoneTitleDto } from './dto/update-zone-title.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailVerificationGuard } from '../auth/guards/email-verification.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { RequestWithUser } from '../auth/types/request-with-user.types';
import { BuildingsMapper } from './buildings.mapper';
import { UpdateZonePhotoDto } from './dto/update-zone-photo.dto';
import { UpdateZoneGeometryDto } from './dto/update-zone-geometry.dto';

@ApiTags('Buildings')
@Controller('buildings')
@UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
@Roles(UserRole.ORGANIZATION_ADMIN)
@ApiBearerAuth('JWT-auth')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  async createBuilding(
    @Body() createBuildingDto: CreateBuildingDto,
    @Req() req: RequestWithUser,
  ) {
    const { building, floor, zone, door } =
      await this.buildingsService.createBuilding(
        req.user.sub,
        createBuildingDto,
      );

    return BuildingsMapper.toCreateBuildingResponse(
      building,
      floor,
      zone,
      door,
    );
  }

  @Post(':id/floors')
  async createFloor(
    @Param('id', ParseIntPipe) buildingId: number,
    @Body() createFloorDto: CreateFloorDto,
    @Req() req: RequestWithUser,
  ) {
    return this.buildingsService.createFloor(
      req.user.sub,
      buildingId,
      createFloorDto,
    );
  }

  @Post('zones')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateZoneWithPhotoDto })
  @UseInterceptors(FileInterceptor('photo'))
  async createZone(
    @Body() createZoneDto: CreateZoneDto,
    @Req() req: RequestWithUser,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.buildingsService.createZone(req.user.sub, createZoneDto, photo);
  }

  @Post('entrance-doors')
  async createEntranceDoor(
    @Body() createEntranceDoorDto: CreateEntranceDoorDto,
    @Req() req: RequestWithUser,
  ) {
    const door = await this.buildingsService.createEntranceDoor(
      req.user.sub,
      createEntranceDoorDto.zone_id,
      createEntranceDoorDto.floor_id,
      createEntranceDoorDto.entrance_door_side,
    );

    return BuildingsMapper.toCreateEntranceDoorResponse(
      door,
      createEntranceDoorDto.zone_id,
    );
  }

  @Post('doors')
  async createDoor(
    @Body() createDoorDto: CreateDoorDto,
    @Req() req: RequestWithUser,
  ) {
    const door = await this.buildingsService.createDoor(
      req.user.sub,
      createDoorDto.zone_from_id,
      createDoorDto.zone_to_id,
      createDoorDto.floor_id,
    );

    return BuildingsMapper.toCreateDoorResponse(door);
  }

  @Patch('zones/:id/title')
  async updateZoneTitle(
    @Param('id', ParseIntPipe) zoneId: number,
    @Body() updateZoneTitleDto: UpdateZoneTitleDto,
    @Req() req: RequestWithUser,
  ) {
    const zone = await this.buildingsService.updateZoneTitle(
      req.user.sub,
      zoneId,
      updateZoneTitleDto.title,
    );
    return BuildingsMapper.toUpdateZoneTitleResponse(zone);
  }

  @Patch('zones/:id/photo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateZonePhotoDto })
  @UseInterceptors(FileInterceptor('photo'))
  async updateZonePhoto(
    @Param('id', ParseIntPipe) zoneId: number,
    @UploadedFile() photo: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    const zone = await this.buildingsService.updateZonePhoto(
      req.user.sub,
      zoneId,
      photo,
    );
    return BuildingsMapper.toUpdateZonePhotoResponse(zone);
  }

  @Patch('zones/:id/geometry')
  async updateZoneGeometry(
    @Param('id', ParseIntPipe) zoneId: number,
    @Body() updateZoneGeometryDto: UpdateZoneGeometryDto,
    @Req() req: RequestWithUser,
  ) {
    const zone = await this.buildingsService.updateZoneGeometry(
      req.user.sub,
      zoneId,
      updateZoneGeometryDto,
    );
    return BuildingsMapper.toUpdateZoneGeometryResponse(zone);
  }
}
