import { OrganizationItemDto } from './organization-item.dto';
import { BuildingDto } from './building.dto';
import { FloorDto } from './floor.dto';
import { ZoneDto } from './zone.dto';
import { DoorDto } from './door.dto';

export class CreateOrganizationResponse extends OrganizationItemDto {
  building: BuildingDto;
  floor: FloorDto;
  zone: ZoneDto;
  door: DoorDto;
}
