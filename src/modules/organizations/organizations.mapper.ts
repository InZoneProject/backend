import { Organization } from './entities/organization.entity';
import { Building } from '../buildings/entities/building.entity';
import { Floor } from '../buildings/entities/floor.entity';
import { Zone } from '../buildings/entities/zone.entity';
import { Door } from '../buildings/entities/door.entity';
import { CreateOrganizationResponse } from './dto/create-organization-response.dto';
import { BuildingDto } from './dto/building.dto';
import { FloorDto } from './dto/floor.dto';
import { ZoneDto } from './dto/zone.dto';
import { DoorDto } from './dto/door.dto';
import { OrganizationItemDto } from './dto/organization-item.dto';

export class OrganizationsMapper {
  static toCreateOrganizationResponse(
    organization: Organization,
    building: Building,
    floor: Floor,
    zone: Zone,
    door: Door,
  ): CreateOrganizationResponse {
    return {
      organization_id: organization.organization_id,
      title: organization.title,
      description: organization.description,
      created_at: organization.created_at,
      building: this.toBuildingDto(building),
      floor: this.toFloorDto(floor),
      zone: this.toZoneDto(zone),
      door: this.toDoorDto(door),
    };
  }

  static toBuildingDto(building: Building): BuildingDto {
    return {
      building_id: building.building_id,
      title: building.title,
      address: building.address,
    };
  }

  static toFloorDto(floor: Floor): FloorDto {
    return {
      floor_id: floor.floor_id,
      floor_number: floor.floor_number,
    };
  }

  static toZoneDto(zone: Zone): ZoneDto {
    return {
      zone_id: zone.zone_id,
      title: zone.title,
      is_transition_between_floors: zone.is_transition_between_floors,
      width: zone.width,
      height: zone.height,
      photo: zone.photo,
      x_coordinate: zone.x_coordinate,
      y_coordinate: zone.y_coordinate,
    };
  }

  static toDoorDto(door: Door): DoorDto {
    return {
      door_id: door.door_id,
      is_entrance: door.is_entrance,
    };
  }

  static toOrganizationItemDto(
    organization: Organization,
  ): OrganizationItemDto {
    return {
      organization_id: organization.organization_id,
      title: organization.title,
      description: organization.description,
      created_at: organization.created_at,
    };
  }
}
