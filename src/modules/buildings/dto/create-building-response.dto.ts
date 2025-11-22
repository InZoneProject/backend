import { BuildingDto } from '../../organizations/dto/building.dto';
import { FloorDto } from '../../organizations/dto/floor.dto';
import { ZoneDto } from '../../organizations/dto/zone.dto';
import { DoorDto } from '../../organizations/dto/door.dto';

export class CreateBuildingResponse extends BuildingDto {
  floor: FloorDto;
  zone: ZoneDto;
  door: DoorDto;
}
