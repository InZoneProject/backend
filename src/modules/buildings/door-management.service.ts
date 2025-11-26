import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Not, IsNull } from 'typeorm';
import { Door } from './entities/door.entity';
import { Zone } from './entities/zone.entity';
import { Floor } from './entities/floor.entity';
import { DoorSide } from './enums/door-side.enum';
import { ZoneGeometryValidator } from './zone-geometry.validator';
import { ZoneGeometryService } from './zone-geometry.service';
import { BUILDINGS_CONSTANTS } from './buildings.constants';

@Injectable()
export class DoorManagementService {
  constructor(
    @InjectRepository(Door)
    private readonly doorRepository: Repository<Door>,
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
    @InjectRepository(Floor)
    private readonly floorRepository: Repository<Floor>,
    private readonly zoneGeometryValidator: ZoneGeometryValidator,
    private readonly zoneGeometryService: ZoneGeometryService,
  ) {}

  async createEntranceDoor(
    zoneId: number,
    floorId: number,
    entranceDoorSide: DoorSide,
  ): Promise<Door> {
    const zone = await this.findZoneById(zoneId);
    const buildingId = zone.building.building_id;

    const floor = await this.validateFloor(floorId, buildingId);
    const existingZones = await this.zoneGeometryService.loadZonesForBuilding(
      buildingId,
      floorId,
    );
    const existingEntranceDoors = await this.findEntranceDoors(zoneId, floorId);

    this.zoneGeometryValidator.validateEntranceDoorSpaceForNewDoor(
      zone,
      entranceDoorSide,
      existingZones,
      existingEntranceDoors,
    );

    return this.doorRepository.save(
      this.doorRepository.create({
        zone_to: zone,
        zone_from: null,
        is_entrance: true,
        entrance_door_side: entranceDoorSide,
        floor: floor,
      }),
    );
  }

  async createRegularDoor(
    zoneFromId: number,
    zoneToId: number,
    floorId: number,
  ): Promise<Door> {
    const [zoneFrom, zoneTo] = await Promise.all([
      this.findZoneById(zoneFromId),
      this.findZoneById(zoneToId),
    ]);

    const buildingIdFrom = zoneFrom.building.building_id;
    const buildingIdTo = zoneTo.building.building_id;

    if (buildingIdFrom !== buildingIdTo) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.ZONES_IN_DIFFERENT_BUILDINGS,
      );
    }

    const floor = await this.validateFloor(floorId, buildingIdFrom);

    this.validateZoneFloorRelationship(zoneFrom, floorId);
    this.validateZoneFloorRelationship(zoneTo, floorId);

    const existingDoorsCount = await this.countDoorsBetweenZones(
      zoneFromId,
      zoneToId,
      floorId,
    );

    this.zoneGeometryValidator.validateRegularDoorSpace(
      zoneFrom,
      zoneTo,
      existingDoorsCount,
    );

    return this.doorRepository.save(
      this.doorRepository.create({
        zone_from: zoneFrom,
        zone_to: zoneTo,
        is_entrance: false,
        entrance_door_side: null,
        floor: floor,
      }),
    );
  }

  async createEntranceDoorForZone(
    zone: Zone,
    floorId: number,
    manager: EntityManager,
  ): Promise<void> {
    const door = manager.create(Door, {
      zone_to: zone,
      zone_from: null,
      is_entrance: true,
      entrance_door_side: DoorSide.BOTTOM,
      floor: { floor_id: floorId },
    });

    await manager.save(door);
  }

  async findEntranceDoors(zoneId: number, floorId?: number): Promise<Door[]> {
    interface WhereCondition {
      zone_to: { zone_id: number };
      is_entrance: boolean;
      entrance_door_side: ReturnType<typeof Not>;
      floor?: { floor_id: number };
    }

    const where: WhereCondition = {
      zone_to: { zone_id: zoneId },
      is_entrance: true,
      entrance_door_side: Not(IsNull()),
    };

    if (floorId !== undefined) {
      where.floor = { floor_id: floorId };
    }

    return this.doorRepository.find({ where } as never);
  }

  async validateEntranceDoorSpace(
    existingZones: Zone[],
    newZoneRect: { x: number; y: number; width: number; height: number },
  ): Promise<void> {
    for (const zone of existingZones) {
      const entranceDoors = await this.findEntranceDoors(zone.zone_id);

      for (const door of entranceDoors) {
        if (door.entrance_door_side) {
          this.zoneGeometryValidator.validateEntranceDoorSpace(
            zone,
            newZoneRect,
            door.entrance_door_side,
            existingZones,
            entranceDoors,
          );
        }
      }
    }
  }

  private async findZoneById(zoneId: number): Promise<Zone> {
    const zone = await this.zoneRepository.findOne({
      where: { zone_id: zoneId },
      relations: ['building', 'building.organization', 'floor'],
    });

    if (!zone) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.ZONE_NOT_FOUND,
      );
    }

    return zone;
  }

  private async validateFloor(
    floorId: number,
    buildingId: number,
  ): Promise<Floor> {
    const floor = await this.floorRepository.findOne({
      where: {
        floor_id: floorId,
        building: { building_id: buildingId },
      },
    });

    if (!floor) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_NOT_FOUND,
      );
    }

    return floor;
  }

  private validateZoneFloorRelationship(zone: Zone, floorId: number): void {
    if (
      !zone.is_transition_between_floors &&
      zone.floor?.floor_id !== floorId
    ) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.ZONES_ON_DIFFERENT_FLOORS,
      );
    }
  }

  async countDoorsBetweenZones(
    zoneFromId: number,
    zoneToId: number,
    floorId: number,
  ): Promise<number> {
    const doors = await this.doorRepository.find({
      where: {
        floor: { floor_id: floorId },
        is_entrance: false,
      },
      relations: ['zone_from', 'zone_to'],
    });

    return doors.filter(
      (door) =>
        door.zone_from &&
        ((door.zone_from.zone_id === zoneFromId &&
          door.zone_to.zone_id === zoneToId) ||
          (door.zone_from.zone_id === zoneToId &&
            door.zone_to.zone_id === zoneFromId)),
    ).length;
  }

  async deleteDoor(doorId: number): Promise<void> {
    await this.doorRepository.delete(doorId);
  }
}
