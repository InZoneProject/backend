import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Zone } from './entities/zone.entity';
import { Door } from './entities/door.entity';
import { Building } from './entities/building.entity';
import { Floor } from './entities/floor.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateZoneGeometryDto } from './dto/update-zone-geometry.dto';
import { ZoneGeometryValidator } from './zone-geometry.validator';
import { ZoneGeometryService } from './zone-geometry.service';
import { DoorManagementService } from './door-management.service';
import { BUILDINGS_CONSTANTS } from './buildings.constants';
import { DoorSide } from './enums/door-side.enum';
import { OrganizationOwnershipValidator } from '../../shared/validators/organization-ownership.validator';
import { FileValidator } from '../../shared/validators/file.validator';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
    @InjectRepository(Floor)
    private readonly floorRepository: Repository<Floor>,
    private readonly zoneGeometryValidator: ZoneGeometryValidator,
    private readonly zoneGeometryService: ZoneGeometryService,
    private readonly doorManagementService: DoorManagementService,
    private readonly organizationOwnershipValidator: OrganizationOwnershipValidator,
    private readonly fileValidator: FileValidator,
    private readonly dataSource: DataSource,
  ) {}

  async createBuilding(userId: number, createBuildingDto: CreateBuildingDto) {
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      createBuildingDto.organization_id,
    );

    return this.dataSource.transaction(async (manager) => {
      const building = await this.createBuildingEntity(
        createBuildingDto,
        manager,
      );
      const firstFloor = await this.createFloorEntity(building, manager);
      const firstZone = await this.createZoneEntity(
        firstFloor,
        building,
        manager,
      );
      const entranceDoor = await this.createEntranceDoorEntity(
        firstZone,
        firstFloor,
        manager,
      );

      return {
        building,
        floor: firstFloor,
        zone: firstZone,
        door: entranceDoor,
      };
    });
  }

  async createFloor(
    userId: number,
    buildingId: number,
    createFloorDto: CreateFloorDto,
  ): Promise<Floor> {
    const building = await this.findBuildingWithRelations(buildingId);

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      building.organization.organization_id,
    );

    return this.dataSource.transaction(async (manager) => {
      await this.shiftFloorNumbers(
        building.floors,
        createFloorDto.floor_number,
        manager,
      );

      const newFloor = await this.createFloorWithNumber(
        buildingId,
        createFloorDto.floor_number,
        manager,
      );

      await this.createDoorsForTransitionZones(buildingId, newFloor, manager);

      return newFloor;
    });
  }

  async createZone(
    userId: number,
    createZoneDto: CreateZoneDto,
    photo?: Express.Multer.File,
  ): Promise<Zone> {
    if (photo) {
      this.fileValidator.validateImageFile(photo);
    }

    const buildingId = createZoneDto.building_id;
    const floorId = this.determineFloorId(createZoneDto);

    const building = await this.findBuildingWithRelations(buildingId);
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      building.organization.organization_id,
    );

    const newZoneRect = this.createRectangleFromDto(createZoneDto);

    await this.validateZonePlacement(newZoneRect, buildingId, floorId);

    return this.dataSource.transaction(async (manager) =>
      this.createZoneWithDoors(
        manager,
        createZoneDto,
        buildingId,
        floorId,
        newZoneRect,
        photo,
      ),
    );
  }

  async updateZoneTitle(
    userId: number,
    zoneId: number,
    title: string,
  ): Promise<Zone> {
    const zone = await this.findZoneWithOrganization(zoneId);

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    zone.title = title;
    return this.zoneRepository.save(zone);
  }

  async updateZonePhoto(
    userId: number,
    zoneId: number,
    photo: Express.Multer.File,
  ): Promise<Zone> {
    this.fileValidator.validateImageFile(photo);

    const zone = await this.findZoneWithOrganization(zoneId);

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    if (zone.photo) {
      await this.deletePhotoFile(zone.photo);
    }

    zone.photo = photo.path;
    return this.zoneRepository.save(zone);
  }

  async updateZoneGeometry(
    userId: number,
    zoneId: number,
    updateDto: UpdateZoneGeometryDto,
  ): Promise<Zone> {
    const zone = await this.findZoneWithOrganization(zoneId);

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    return this.dataSource.transaction(async (manager) =>
      this.zoneGeometryService.updateZoneGeometry(zone, updateDto, manager),
    );
  }

  async createEntranceDoor(
    userId: number,
    zoneId: number,
    floorId: number,
    entranceDoorSide: DoorSide,
  ): Promise<Door> {
    const zone = await this.findZoneWithOrganization(zoneId);

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    if (!zone.is_transition_between_floors && zone.floor) {
      if (zone.floor.floor_id !== floorId) {
        throw new BadRequestException(
          BUILDINGS_CONSTANTS.ERROR_MESSAGES.ENTRANCE_DOOR_FLOOR_MISMATCH,
        );
      }
    }

    return this.doorManagementService.createEntranceDoor(
      zoneId,
      floorId,
      entranceDoorSide,
    );
  }

  async createDoor(
    userId: number,
    zoneFromId: number,
    zoneToId: number,
    floorId: number,
  ): Promise<Door> {
    const zoneFrom = await this.findZoneWithOrganization(zoneFromId);

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zoneFrom.building.organization.organization_id,
    );

    return this.doorManagementService.createRegularDoor(
      zoneFromId,
      zoneToId,
      floorId,
    );
  }

  private async createBuildingEntity(
    dto: CreateBuildingDto,
    manager: EntityManager,
  ): Promise<Building> {
    const building = manager.create(Building, {
      title: dto.title,
      address: dto.address,
      organization: { organization_id: dto.organization_id },
    });

    return manager.save(building);
  }

  private async findBuildingWithRelations(
    buildingId: number,
  ): Promise<Building> {
    const building = await this.buildingRepository.findOne({
      where: { building_id: buildingId },
      relations: ['organization', 'floors'],
    });

    if (!building) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.BUILDING_NOT_FOUND,
      );
    }

    return building;
  }

  private async shiftFloorNumbers(
    floors: Floor[],
    insertAtNumber: number,
    manager: EntityManager,
  ): Promise<void> {
    const floorsToUpdate = floors.filter(
      (floor) => floor.floor_number >= insertAtNumber,
    );

    for (const floor of floorsToUpdate) {
      await manager.update(Floor, floor.floor_id, {
        floor_number: floor.floor_number + 1,
      });
    }
  }

  private async createFloorWithNumber(
    buildingId: number,
    floorNumber: number,
    manager: EntityManager,
  ): Promise<Floor> {
    const newFloor = manager.create(Floor, {
      floor_number: floorNumber,
      building: { building_id: buildingId },
    });

    return manager.save(newFloor);
  }

  private async createFloorEntity(
    building: Building,
    manager: EntityManager,
  ): Promise<Floor> {
    const firstFloor = manager.create(Floor, {
      building: building,
    });

    return manager.save(firstFloor);
  }

  private async createDoorsForTransitionZones(
    buildingId: number,
    newFloor: Floor,
    manager: EntityManager,
  ): Promise<void> {
    const transitionZones = await this.zoneRepository.find({
      where: {
        building: { building_id: buildingId },
        is_transition_between_floors: true,
      },
    });

    for (let i = 0; i < transitionZones.length; i++) {
      for (let j = i + 1; j < transitionZones.length; j++) {
        const zone1 = transitionZones[i];
        const zone2 = transitionZones[j];

        const intersection = this.zoneGeometryValidator.calculateIntersection(
          this.createRectangleFromZone(zone1),
          this.createRectangleFromZone(zone2),
        );

        if (
          intersection.hasIntersection &&
          intersection.intersectionLength >=
            BUILDINGS_CONSTANTS.ZONE.MIN_INTERSECTION
        ) {
          const door = manager.create(Door, {
            zone_from: zone1,
            zone_to: zone2,
            is_entrance: false,
            entrance_door_side: null,
            floor: newFloor,
          });

          await manager.save(door);
        }
      }
    }
  }

  private async findZoneWithOrganization(zoneId: number): Promise<Zone> {
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

  private determineFloorId(createZoneDto: CreateZoneDto): number | undefined {
    if (createZoneDto.is_transition_between_floors) {
      return undefined;
    }

    if (!createZoneDto.floor_id) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_ID_REQUIRED_FOR_NON_TRANSITION,
      );
    }

    return createZoneDto.floor_id;
  }

  private async validateFloorExists(
    floorId: number,
    buildingId: number,
  ): Promise<void> {
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
  }

  private createRectangleFromDto(dto: {
    x_coordinate: number;
    y_coordinate: number;
    width: number;
    height: number;
  }) {
    return {
      x: dto.x_coordinate,
      y: dto.y_coordinate,
      width: dto.width,
      height: dto.height,
    };
  }

  private createRectangleFromZone(zone: Zone) {
    return {
      x: zone.x_coordinate,
      y: zone.y_coordinate,
      width: zone.width,
      height: zone.height,
    };
  }

  private async validateZonePlacement(
    newZoneRect: { x: number; y: number; width: number; height: number },
    buildingId: number,
    floorId: number | undefined,
  ): Promise<void> {
    if (floorId !== undefined) {
      await this.validateFloorExists(floorId, buildingId);
    }

    const existingZones = await this.zoneGeometryService.loadZonesForBuilding(
      buildingId,
      floorId,
      true,
    );

    const allZonesInBuilding =
      await this.zoneGeometryService.loadZonesForBuilding(
        buildingId,
        undefined,
        true,
      );

    if (allZonesInBuilding.length > 0 && existingZones.length === 0) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.NO_INTERSECTION,
      );
    }

    if (existingZones.length > 0) {
      this.zoneGeometryValidator.validateHasIntersectionWithAtLeastOneZone(
        newZoneRect,
        existingZones,
      );
    }

    this.zoneGeometryValidator.validateNoOverlap(newZoneRect, existingZones);

    await this.doorManagementService.validateEntranceDoorSpace(
      existingZones,
      newZoneRect,
    );
  }

  private async createZoneWithDoors(
    manager: EntityManager,
    createZoneDto: CreateZoneDto,
    buildingId: number,
    floorId: number | undefined,
    newZoneRect: { x: number; y: number; width: number; height: number },
    photo?: Express.Multer.File,
  ): Promise<Zone> {
    const newZone = await this.createZoneEntity(
      floorId ? { floor_id: floorId } : null,
      { building_id: buildingId },
      manager,
      createZoneDto,
      photo,
    );

    const existingZones = await this.zoneGeometryService.loadZonesForBuilding(
      buildingId,
      floorId,
      true,
    );

    if (existingZones.length === 0 && floorId !== undefined) {
      await this.doorManagementService.createEntranceDoorForZone(
        newZone,
        floorId,
        manager,
      );
    } else if (existingZones.length > 0) {
      const intersectingZones = this.zoneGeometryService.findIntersectingZones(
        newZoneRect,
        existingZones,
      );

      if (intersectingZones.length > 0) {
        const targetZone = intersectingZones[0];

        if (createZoneDto.is_transition_between_floors) {
          await this.createDoorsForTransitionZone(newZone, buildingId, manager);
        } else {
          await this.createDoorBetweenZones(
            targetZone,
            newZone,
            floorId,
            buildingId,
            manager,
          );
        }
      }
    }

    return newZone;
  }

  private async createDoorsForTransitionZone(
    newTransitionZone: Zone,
    buildingId: number,
    manager: EntityManager,
  ): Promise<void> {
    const floors = await manager.find(Floor, {
      where: { building: { building_id: buildingId } },
    });

    const newZoneRect = this.createRectangleFromZone(newTransitionZone);

    for (const floor of floors) {
      const zonesOnFloor = await manager.find(Zone, {
        where: [
          {
            floor: { floor_id: floor.floor_id },
            building: { building_id: buildingId },
          },
          {
            is_transition_between_floors: true,
            building: { building_id: buildingId },
          },
        ],
      });

      const existingZonesOnFloor = zonesOnFloor.filter(
        (z) => z.zone_id !== newTransitionZone.zone_id,
      );

      let hasIntersectionOnThisFloor = false;
      let zoneToConnectWith: Zone | null = null;

      for (const existingZone of existingZonesOnFloor) {
        const existingZoneRect = this.createRectangleFromZone(existingZone);
        const intersection = this.zoneGeometryValidator.calculateIntersection(
          newZoneRect,
          existingZoneRect,
        );

        if (
          intersection.hasIntersection &&
          intersection.intersectionLength >=
            BUILDINGS_CONSTANTS.ZONE.MIN_INTERSECTION
        ) {
          hasIntersectionOnThisFloor = true;
          zoneToConnectWith = existingZone;
          break;
        }
      }

      if (hasIntersectionOnThisFloor && zoneToConnectWith) {
        const existingDoorsOnFloor = await manager.find(Door, {
          where: [
            {
              zone_from: { zone_id: newTransitionZone.zone_id },
              floor: { floor_id: floor.floor_id },
            },
            {
              zone_to: { zone_id: newTransitionZone.zone_id },
              floor: { floor_id: floor.floor_id },
            },
          ],
        });

        if (existingDoorsOnFloor.length === 0) {
          await this.createSingleDoor(
            zoneToConnectWith,
            newTransitionZone,
            floor.floor_id,
            manager,
          );
        }
      }
    }
  }

  private async createSingleDoor(
    zone1: Zone,
    zone2: Zone,
    floorId: number,
    manager: EntityManager,
  ): Promise<void> {
    const door = manager.create(Door, {
      zone_from: zone1,
      zone_to: zone2,
      is_entrance: false,
      entrance_door_side: null,
      floor: { floor_id: floorId },
    });

    await manager.save(door);
  }

  private async createDoorBetweenZones(
    zone1: Zone,
    zone2: Zone,
    floorId: number | undefined,
    buildingId: number,
    manager: EntityManager,
  ): Promise<void> {
    const relevantFloorId = this.determineFloorForDoorCreation(
      zone1,
      zone2,
      floorId,
    );

    if (relevantFloorId !== null) {
      const door = manager.create(Door, {
        zone_from: zone1,
        zone_to: zone2,
        is_entrance: false,
        entrance_door_side: null,
        floor: { floor_id: relevantFloorId },
      });

      await manager.save(door);
    } else {
      const floors = await manager.find(Floor, {
        where: { building: { building_id: buildingId } },
      });

      for (const floor of floors) {
        const door = manager.create(Door, {
          zone_from: zone1,
          zone_to: zone2,
          is_entrance: false,
          entrance_door_side: null,
          floor: floor,
        });

        await manager.save(door);
      }
    }
  }

  private determineFloorForDoorCreation(
    zone1: Zone,
    zone2: Zone,
    currentFloorId: number | undefined,
  ): number | null {
    if (currentFloorId !== undefined) {
      return currentFloorId;
    }

    if (zone1.floor) {
      return zone1.floor.floor_id;
    }

    if (zone2.floor) {
      return zone2.floor.floor_id;
    }

    return null;
  }

  private async createZoneEntity(
    floor: { floor_id: number } | null,
    building: { building_id: number },
    manager: EntityManager,
    dto?: CreateZoneDto,
    photo?: Express.Multer.File,
  ): Promise<Zone> {
    interface ZoneData {
      floor: { floor_id: number } | null;
      building: { building_id: number };
      title?: string;
      width?: number;
      height?: number;
      x_coordinate?: number;
      y_coordinate?: number;
      is_transition_between_floors?: boolean;
      photo?: string | null;
    }

    const zoneData: ZoneData = {
      floor: floor,
      building: building,
    };

    if (dto) {
      zoneData.title = dto.title;
      zoneData.width = dto.width;
      zoneData.height = dto.height;
      zoneData.x_coordinate = dto.x_coordinate;
      zoneData.y_coordinate = dto.y_coordinate;
      zoneData.is_transition_between_floors = dto.is_transition_between_floors;
      zoneData.photo = photo ? photo.path : null;
    }

    const zone = manager.create(Zone, zoneData);
    return manager.save(zone);
  }

  private async createEntranceDoorEntity(
    zone: Zone,
    floor: Floor,
    manager: EntityManager,
  ): Promise<Door> {
    const entranceDoor = manager.create(Door, {
      zone_to: zone,
      zone_from: null,
      is_entrance: true,
      entrance_door_side: DoorSide.BOTTOM,
      floor: floor,
    });

    return manager.save(entranceDoor);
  }

  private async deletePhotoFile(photoPath: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.unlink(photoPath);
    } catch (error) {
      console.error(
        BUILDINGS_CONSTANTS.LOG_MESSAGES.FAILED_TO_DELETE_PHOTO,
        error,
      );
    }
  }
}
