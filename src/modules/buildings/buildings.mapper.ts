import { BadRequestException } from '@nestjs/common';
import { Building } from './entities/building.entity';
import { Floor } from './entities/floor.entity';
import { Zone } from './entities/zone.entity';
import { Door } from './entities/door.entity';
import { CreateBuildingResponse } from './dto/create-building-response.dto';
import { CreateEntranceDoorResponse } from './dto/create-entrance-door-response.dto';
import { CreateDoorResponse } from './dto/create-door-response.dto';
import { UpdateZoneTitleResponse } from './dto/update-zone-title-response.dto';
import { UpdateZonePhotoResponse } from './dto/update-zone-photo-response.dto';
import { UpdateZoneGeometryResponse } from './dto/update-zone-geometry-response.dto';
import { BUILDINGS_CONSTANTS } from './buildings.constants';

export class BuildingsMapper {
  static toCreateBuildingResponse(
    building: Building,
    floor: Floor,
    zone: Zone,
    door: Door,
  ): CreateBuildingResponse {
    return {
      building_id: building.building_id,
      title: building.title,
      address: building.address,
      floor: {
        floor_id: floor.floor_id,
        floor_number: floor.floor_number,
      },
      zone: {
        zone_id: zone.zone_id,
        title: zone.title,
        is_transition_between_floors: zone.is_transition_between_floors,
        width: zone.width,
        height: zone.height,
        photo: zone.photo,
        x_coordinate: zone.x_coordinate,
        y_coordinate: zone.y_coordinate,
      },
      door: {
        door_id: door.door_id,
        is_entrance: door.is_entrance,
      },
    };
  }

  static toCreateEntranceDoorResponse(
    door: Door,
    zoneId: number,
  ): CreateEntranceDoorResponse {
    return {
      door_id: door.door_id,
      zone_id: zoneId,
      floor_id: door.floor.floor_id,
      entrance_door_side: door.entrance_door_side!,
      created_at: door.created_at,
    };
  }

  static toCreateDoorResponse(door: Door): CreateDoorResponse {
    if (!door.zone_from) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.ZONE_FROM_REQUIRED_FOR_REGULAR_DOOR,
      );
    }

    return {
      door_id: door.door_id,
      zone_from_id: door.zone_from.zone_id,
      zone_to_id: door.zone_to.zone_id,
      floor_id: door.floor.floor_id,
      created_at: door.created_at,
    };
  }

  static toUpdateZoneTitleResponse(zone: Zone): UpdateZoneTitleResponse {
    return {
      zone_id: zone.zone_id,
      title: zone.title,
    };
  }

  static toUpdateZonePhotoResponse(zone: Zone): UpdateZonePhotoResponse {
    return {
      zone_id: zone.zone_id,
      photo: zone.photo,
    };
  }

  static toUpdateZoneGeometryResponse(zone: Zone): UpdateZoneGeometryResponse {
    return {
      zone_id: zone.zone_id,
      width: zone.width,
      height: zone.height,
      x_coordinate: zone.x_coordinate,
      y_coordinate: zone.y_coordinate,
    };
  }
}
