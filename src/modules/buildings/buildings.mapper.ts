import { BadRequestException } from '@nestjs/common';
import { basename } from 'path';
import { Building } from './entities/building.entity';
import { Floor } from './entities/floor.entity';
import { Zone } from './entities/zone.entity';
import { Door } from './entities/door.entity';
import { CreateBuildingResponse } from './dto/create-building-response.dto';
import { CreateEntranceDoorResponse } from './dto/create-entrance-door-response.dto';
import { CreateDoorResponse } from './dto/create-door-response.dto';
import { UpdateZoneTitleResponse } from './dto/update-zone-title-response.dto';
import { UpdateZonePhotoResponse } from './dto/update-zone-photo-response.dto';
import { BuildingInfoResponseDto } from './dto/building-info-response.dto';
import { FloorMapResponseDto } from './dto/floor-map-response.dto';
import { ZoneMapDto } from './dto/zone-map.dto';
import { DoorMapDto } from './dto/door-map.dto';
import { BUILDINGS_CONSTANTS } from './buildings.constants';
import { ZoneGeometryDependenciesResponseDto } from './dto/zone-geometry-dependencies-response.dto';
import { FILE_VALIDATION_CONSTANTS } from '../../shared/constants/file-validation.constants';
import { FloorMapMetaDto } from './dto/floor-map-meta.dto';
import { ZoneClusterDto } from './dto/zone-cluster.dto';

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
        floor_name: floor.floor_name,
      },
      zone: {
        zone_id: zone.zone_id,
        title: zone.title,
        is_transition_between_floors: zone.is_transition_between_floors,
        width: zone.width,
        height: zone.height,
        photo: BuildingsMapper.toPublicPhotoPath(zone.photo),
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
      photo: BuildingsMapper.toPublicPhotoPath(zone.photo),
    };
  }

  static toBuildingInfoResponse(building: Building): BuildingInfoResponseDto {
    return {
      building_id: building.building_id,
      organization_id: building.organization.organization_id,
      title: building.title,
      address: building.address,
      created_at: building.created_at,
    };
  }

  static toFloorMapResponse(
    zones: Zone[],
    doors: Door[],
    transitionValidationZones: Zone[] = zones,
    transitionValidationDoors: Door[] = doors,
    deletableZoneIds: number[] = [],
    deletableDoorIds: number[] = [],
    mapMeta: FloorMapMetaDto,
    zoneClusters: ZoneClusterDto[] = [],
  ): FloorMapResponseDto {
    return {
      zones: zones.map((zone) => BuildingsMapper.toZoneMapDto(zone)),
      doors: doors.map((door) => BuildingsMapper.toDoorMapDto(door)),
      transition_validation_zones: transitionValidationZones.map((zone) =>
        BuildingsMapper.toZoneMapDto(zone),
      ),
      transition_validation_doors: transitionValidationDoors.map((door) =>
        BuildingsMapper.toDoorMapDto(door),
      ),
      deletable_zone_ids: deletableZoneIds,
      deletable_door_ids: deletableDoorIds,
      map_meta: mapMeta,
      zone_clusters: zoneClusters,
    };
  }

  static toZoneGeometryDependenciesResponse(
    zones: Zone[],
    doors: Door[],
  ): ZoneGeometryDependenciesResponseDto {
    const floorMap = new Map<number, Floor>();

    for (const zone of zones) {
      if (zone.floor) {
        floorMap.set(zone.floor.floor_id, zone.floor);
      }
    }

    for (const door of doors) {
      if (door.floor) {
        floorMap.set(door.floor.floor_id, door.floor);
      }
    }

    return {
      zones: zones.map((zone) => BuildingsMapper.toZoneMapDto(zone)),
      doors: doors.map((door) => BuildingsMapper.toDoorMapDto(door)),
      floors: [...floorMap.values()]
        .sort((a, b) => a.floor_number - b.floor_number)
        .map((floor) => ({
          floor_id: floor.floor_id,
          floor_number: floor.floor_number,
          floor_name: floor.floor_name,
          can_delete: false,
        })),
    };
  }

  private static toZoneMapDto(zone: Zone): ZoneMapDto {
    return {
      zone_id: zone.zone_id,
      title: zone.title,
      is_transition_between_floors: zone.is_transition_between_floors,
      width: zone.width,
      height: zone.height,
      photo: BuildingsMapper.toPublicPhotoPath(zone.photo),
      x_coordinate: zone.x_coordinate,
      y_coordinate: zone.y_coordinate,
      floor_id: zone.floor?.floor_id ?? null,
    };
  }

  private static toDoorMapDto(door: Door): DoorMapDto {
    return {
      door_id: door.door_id,
      is_entrance: door.is_entrance,
      entrance_door_side: door.entrance_door_side,
      zone_from_id: door.zone_from?.zone_id ?? null,
      zone_to_id: door.zone_to.zone_id,
      floor_id: door.floor.floor_id,
      rfid_reader_id: door.rfid_reader?.rfid_reader_id ?? null,
    };
  }

  private static toPublicPhotoPath(photoPath: string | null): string | null {
    if (!photoPath) return null;

    const normalizedPath = photoPath.replace(/\\/g, '/');
    const uploadsIndex = normalizedPath.lastIndexOf('/uploads/');
    if (uploadsIndex >= 0) return normalizedPath.slice(uploadsIndex);

    const uploadsPrefix = FILE_VALIDATION_CONSTANTS.UPLOADS_URL_PREFIX.replace(
      /\/$/,
      '',
    );
    return `${uploadsPrefix}/${basename(normalizedPath)}`;
  }
}
