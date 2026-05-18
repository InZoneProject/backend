import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Zone } from './entities/zone.entity';
import { Door } from './entities/door.entity';
import { Building } from './entities/building.entity';
import { Floor } from './entities/floor.entity';
import { RfidReader } from '../rfid/entities/rfid-reader.entity';
import { ScanEvent } from '../rfid/entities/scan-event.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateZoneGeometryDto } from './dto/update-zone-geometry.dto';
import { ShiftBuildingZonesDto } from './dto/shift-building-zones.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { ZoneGeometryValidator } from './zone-geometry.validator';
import { ZoneGeometryService } from './zone-geometry.service';
import { DoorManagementService } from './door-management.service';
import { BUILDINGS_CONSTANTS } from './buildings.constants';
import { DoorSide } from './enums/door-side.enum';
import { OrganizationOwnershipValidator } from '../../shared/validators/organization-ownership.validator';
import { FileValidator } from '../../shared/validators/file.validator';
import { Employee } from '../employees/entities/employee.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { BuildingsMovementsMapper } from './buildings-movements.mapper';
import { EmployeeDailyMovementsResponseDto } from './dto/employee-daily-movements-response.dto';
import { EmployeeMovementItemDto } from './dto/employee-movement-item.dto';
import { determineNewZoneById } from '../../shared/utils/zone-navigation.util';
import { RedisService } from '../redis/redis.service';
import { SCAN_STATE_CACHE_CONSTANTS } from '../mqtt/constants/scan-state-cache.constants';

interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FloorMapQueryOptions {
  viewport?: ViewportBounds;
  cursor?: number;
  limit?: number;
}

interface FloorMapMeta {
  limit: number;
  next_cursor: number | null;
  has_more: boolean;
  is_lod: boolean;
}

export interface MapSeed {
  viewport: ViewportBounds;
}

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
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
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

    const maxFloorNumber =
      building.floors.length > 0
        ? Math.max(...building.floors.map((f) => f.floor_number))
        : 0;

    if (createFloorDto.floor_number > maxFloorNumber + 1) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_NUMBER_TOO_HIGH_FOR_CREATE(
          maxFloorNumber,
        ),
      );
    }

    return this.dataSource.transaction(async (manager) => {
      await this.shiftFloorNumbers(
        building.floors,
        createFloorDto.floor_number,
        manager,
      );

      const newFloor = await this.createFloorWithNumber(
        buildingId,
        createFloorDto.floor_number,
        createFloorDto.floor_name.trim(),
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
  ) {
    const zone = await this.findZoneWithOrganization(zoneId);

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    await this.dataSource.transaction(async (manager) =>
      this.zoneGeometryService.updateZoneGeometry(zone, updateDto, manager),
    );

    return;
  }

  async getZoneGeometryDependencies(
    userId: number,
    zoneId: number,
    viewport?: ViewportBounds,
  ) {
    const zone = await this.findZoneWithOrganization(zoneId);

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    const buildingId = zone.building.building_id;
    const [allZones, allDoors] = await Promise.all([
      this.zoneGeometryService.loadZonesForBuilding(buildingId),
      this.dataSource.getRepository(Door).find({
        where: { floor: { building: { building_id: buildingId } } },
        relations: ['zone_from', 'zone_to', 'floor', 'rfid_reader'],
      }),
    ]);

    const coordinatesMap =
      this.zoneGeometryService.createCoordinatesMap(allZones);
    const connectedZoneIds = new Set<number>([zoneId]);
    const queue = [zoneId];

    while (queue.length > 0) {
      const currentZoneId = queue.shift()!;
      const connectedZones = this.zoneGeometryService.findConnectedZones(
        currentZoneId,
        allDoors,
        allZones,
        coordinatesMap,
      );

      for (const connectedZone of connectedZones) {
        if (connectedZoneIds.has(connectedZone.zone_id)) continue;

        connectedZoneIds.add(connectedZone.zone_id);
        queue.push(connectedZone.zone_id);
      }
    }

    const visibleZoneIds = new Set(
      this.filterZonesByViewport(allZones, viewport).map(
        (item) => item.zone_id,
      ),
    );
    visibleZoneIds.add(zoneId);
    const zones = allZones.filter(
      (item) =>
        connectedZoneIds.has(item.zone_id) && visibleZoneIds.has(item.zone_id),
    );
    const includedZoneIds = new Set(zones.map((item) => item.zone_id));
    const doors = allDoors.filter((door) => {
      const zoneFromIncluded = door.zone_from
        ? includedZoneIds.has(door.zone_from.zone_id)
        : false;
      const zoneToIncluded = includedZoneIds.has(door.zone_to.zone_id);

      return door.is_entrance
        ? zoneToIncluded
        : zoneFromIncluded && zoneToIncluded;
    });

    return { zones, doors };
  }

  async shiftBuildingZones(
    userId: number,
    zoneId: number,
    shiftDto: ShiftBuildingZonesDto,
  ) {
    const zone = await this.findZoneWithOrganization(zoneId);

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    await this.dataSource.transaction(async (manager) =>
      this.zoneGeometryService.shiftBuildingZones(zone, shiftDto, manager),
    );

    return;
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

  async getBuildingInfo(userId: number, buildingId: number): Promise<Building> {
    const building = await this.buildingRepository.findOne({
      where: { building_id: buildingId },
      relations: ['organization'],
    });

    if (!building) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.BUILDING_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      building.organization.organization_id,
    );

    return building;
  }

  async getBuildingFloors(
    userId: number,
    buildingId: number,
    offset: number,
    limit: number,
    search?: string,
  ) {
    const building = await this.findBuildingWithRelations(buildingId);

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      building.organization.organization_id,
    );

    const query = this.floorRepository
      .createQueryBuilder('floor')
      .where('floor.building_id = :buildingId', { buildingId });

    if (search) {
      query.andWhere('floor.floor_name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [floors, total] = await query
      .orderBy('floor.floor_number', 'ASC')
      .offset(offset)
      .limit(limit)
      .getManyAndCount();

    const items = await Promise.all(
      floors.map(async (floor) => ({
        floor_id: floor.floor_id,
        floor_number: floor.floor_number,
        floor_name: floor.floor_name,
        can_delete: await this.canDeleteFloor(
          floor.floor_id,
          buildingId,
          total,
        ),
      })),
    );

    return { items, total, offset, limit };
  }

  async updateBuilding(
    userId: number,
    buildingId: number,
    updateBuildingDto: UpdateBuildingDto,
  ): Promise<Building> {
    const building = await this.buildingRepository.findOne({
      where: { building_id: buildingId },
      relations: ['organization'],
    });

    if (!building) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.BUILDING_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      building.organization.organization_id,
    );

    if (updateBuildingDto.title !== undefined) {
      building.title = updateBuildingDto.title;
    }

    if (updateBuildingDto.address !== undefined) {
      building.address = updateBuildingDto.address;
    }

    return this.buildingRepository.save(building);
  }

  async deleteFloor(userId: number, floorId: number): Promise<void> {
    const floor = await this.floorRepository.findOne({
      where: { floor_id: floorId },
      relations: ['building', 'building.organization', 'building.floors'],
    });

    if (!floor) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      floor.building.organization.organization_id,
    );

    if (floor.building.floors.length === 1) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.CANNOT_DELETE_LAST_FLOOR,
      );
    }

    const buildingId = floor.building.building_id;
    await this.validateFloorDeletion(floorId, buildingId);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Floor, floorId);

      const remainingFloors = floor.building.floors
        .filter((f) => f.floor_id !== floorId)
        .sort((a, b) => a.floor_number - b.floor_number);

      for (let i = 0; i < remainingFloors.length; i++) {
        await manager.update(Floor, remainingFloors[i].floor_id, {
          floor_number: i + 1,
        });
      }
    });
  }

  async reorderFloor(
    userId: number,
    floorId: number,
    newFloorNumber: number,
  ): Promise<void> {
    const floor = await this.floorRepository.findOne({
      where: { floor_id: floorId },
      relations: ['building', 'building.organization', 'building.floors'],
    });

    if (!floor) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      floor.building.organization.organization_id,
    );

    if (floor.floor_number === newFloorNumber) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_ALREADY_AT_POSITION,
      );
    }

    const maxFloorNumber = Math.max(
      ...floor.building.floors.map((f) => f.floor_number),
    );

    if (newFloorNumber > maxFloorNumber) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_NUMBER_TOO_HIGH_FOR_REORDER(
          maxFloorNumber,
        ),
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const oldFloorNumber = floor.floor_number;

      if (newFloorNumber < oldFloorNumber) {
        const floorsToShift = floor.building.floors.filter(
          (f) =>
            f.floor_number >= newFloorNumber && f.floor_number < oldFloorNumber,
        );

        for (const floorToShift of floorsToShift) {
          await manager.update(Floor, floorToShift.floor_id, {
            floor_number: floorToShift.floor_number + 1,
          });
        }
      } else {
        const floorsToShift = floor.building.floors.filter(
          (f) =>
            f.floor_number > oldFloorNumber && f.floor_number <= newFloorNumber,
        );

        for (const floorToShift of floorsToShift) {
          await manager.update(Floor, floorToShift.floor_id, {
            floor_number: floorToShift.floor_number - 1,
          });
        }
      }

      await manager.update(Floor, floorId, {
        floor_number: newFloorNumber,
      });
    });
  }

  async updateFloorName(
    userId: number,
    floorId: number,
    floorName: string,
  ): Promise<Floor> {
    const floor = await this.floorRepository.findOne({
      where: { floor_id: floorId },
      relations: ['building', 'building.organization'],
    });

    if (!floor) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      floor.building.organization.organization_id,
    );

    floor.floor_name = floorName.trim();
    return this.floorRepository.save(floor);
  }

  async deleteEntranceDoor(userId: number, doorId: number): Promise<void> {
    const door = await this.findDoorWithRelations(doorId);

    if (!door.is_entrance) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.DOOR_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      door.zone_to.building.organization.organization_id,
    );

    const buildingId = door.zone_to.building.building_id;

    const totalEntranceDoors =
      await this.countEntranceDoorsInBuilding(buildingId);

    if (totalEntranceDoors === 1) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.CANNOT_DELETE_LAST_ENTRANCE_DOOR,
      );
    }

    await this.doorManagementService.deleteDoor(doorId);
  }

  async deleteRegularDoor(userId: number, doorId: number): Promise<void> {
    const door = await this.findDoorWithRelations(doorId);

    if (door.is_entrance || !door.zone_from) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.DOOR_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      door.zone_to.building.organization.organization_id,
    );

    const canDeleteWithoutDisconnecting =
      await this.canDeleteRegularDoorWithoutDisconnectingBuilding(
        doorId,
        door.zone_to.building.building_id,
      );

    if (!canDeleteWithoutDisconnecting) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.CANNOT_DELETE_DOOR_WOULD_DISCONNECT_BUILDING,
      );
    }

    await this.doorManagementService.deleteDoor(doorId);
  }

  private async canDeleteRegularDoorWithoutDisconnectingBuilding(
    doorId: number,
    buildingId: number,
  ): Promise<boolean> {
    const zones = await this.zoneRepository.find({
      where: { building: { building_id: buildingId } },
    });

    if (zones.length <= 1) {
      return true;
    }

    const regularDoors = await this.dataSource.getRepository(Door).find({
      where: {
        zone_to: { building: { building_id: buildingId } },
        is_entrance: false,
      },
      relations: ['zone_from', 'zone_to'],
    });

    const filteredDoors = regularDoors.filter(
      (door) => door.door_id !== doorId && door.zone_from,
    );

    if (filteredDoors.length === 0) {
      return false;
    }

    const adjacency = new Map<number, Set<number>>();

    for (const zone of zones) {
      adjacency.set(zone.zone_id, new Set());
    }

    for (const door of filteredDoors) {
      if (!door.zone_from) continue;

      adjacency.get(door.zone_from.zone_id)?.add(door.zone_to.zone_id);
      adjacency.get(door.zone_to.zone_id)?.add(door.zone_from.zone_id);
    }

    const startZoneId = zones[0].zone_id;
    const visited = new Set<number>([startZoneId]);
    const queue = [startZoneId];

    while (queue.length > 0) {
      const currentZoneId = queue.shift()!;

      for (const nextZoneId of adjacency.get(currentZoneId) || []) {
        if (visited.has(nextZoneId)) continue;

        visited.add(nextZoneId);
        queue.push(nextZoneId);
      }
    }

    return visited.size === zones.length;
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
    floorName: string,
    manager: EntityManager,
  ): Promise<Floor> {
    const newFloor = manager.create(Floor, {
      floor_number: floorNumber,
      floor_name: floorName,
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
      floor_name: 'Новий поверх',
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
        const targetZone =
          intersectingZones.find(
            (item) => item.zone_id === createZoneDto.zone_from_id,
          ) ?? intersectingZones[0];

        if (createZoneDto.is_transition_between_floors) {
          await this.createDoorBetweenZones(
            targetZone,
            newZone,
            createZoneDto.floor_id,
            buildingId,
            manager,
          );
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

  private async findDoorWithRelations(doorId: number): Promise<Door> {
    const doorRepository = this.dataSource.getRepository(Door);
    const door = await doorRepository.findOne({
      where: { door_id: doorId },
      relations: [
        'zone_to',
        'zone_to.building',
        'zone_to.building.organization',
        'zone_from',
        'floor',
      ],
    });

    if (!door) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.DOOR_NOT_FOUND,
      );
    }

    return door;
  }

  private async countEntranceDoorsInBuilding(
    buildingId: number,
  ): Promise<number> {
    const doorRepository = this.dataSource.getRepository(Door);
    return doorRepository.count({
      where: {
        is_entrance: true,
        zone_to: { building: { building_id: buildingId } },
      },
    });
  }

  private async validateFloorDeletion(
    floorId: number,
    buildingId: number,
  ): Promise<void> {
    const doorRepository = this.dataSource.getRepository(Door);

    const entranceDoorsOnFloor = await doorRepository.count({
      where: {
        floor: { floor_id: floorId },
        is_entrance: true,
      },
    });

    if (entranceDoorsOnFloor > 0) {
      const totalEntranceDoors =
        await this.countEntranceDoorsInBuilding(buildingId);

      if (entranceDoorsOnFloor === totalEntranceDoors) {
        throw new BadRequestException(
          BUILDINGS_CONSTANTS.ERROR_MESSAGES.CANNOT_DELETE_FLOOR_WITH_LAST_ENTRANCE_DOOR,
        );
      }
    }

    const transitionZones = await this.zoneRepository.find({
      where: {
        building: { building_id: buildingId },
        is_transition_between_floors: true,
      },
    });

    for (const transitionZone of transitionZones) {
      const doorsOnThisFloor = await doorRepository.count({
        where: [
          {
            zone_from: { zone_id: transitionZone.zone_id },
            floor: { floor_id: floorId },
          },
          {
            zone_to: { zone_id: transitionZone.zone_id },
            floor: { floor_id: floorId },
          },
        ],
      });

      if (doorsOnThisFloor > 0) {
        const totalDoorsForTransitionZone = await doorRepository.count({
          where: [
            {
              zone_from: { zone_id: transitionZone.zone_id },
              is_entrance: false,
            },
            {
              zone_to: { zone_id: transitionZone.zone_id },
              is_entrance: false,
            },
          ],
        });

        if (doorsOnThisFloor === totalDoorsForTransitionZone) {
          throw new BadRequestException(
            BUILDINGS_CONSTANTS.ERROR_MESSAGES.CANNOT_DELETE_FLOOR_WOULD_DISCONNECT_TRANSITION_ZONE(
              transitionZone.title,
            ),
          );
        }
      }
    }
  }

  private async canDeleteFloor(
    floorId: number,
    buildingId: number,
    floorsCount: number,
  ): Promise<boolean> {
    if (floorsCount <= 1) return false;

    try {
      await this.validateFloorDeletion(floorId, buildingId);
      return true;
    } catch {
      return false;
    }
  }

  async getBuildingMap(
    userId: number,
    buildingId: number | null,
    floorId: number,
    options: FloorMapQueryOptions = {},
  ) {
    const floor = await this.floorRepository.findOne({
      where:
        buildingId === null
          ? { floor_id: floorId }
          : { floor_id: floorId, building: { building_id: buildingId } },
      relations: ['building', 'building.organization'],
    });

    if (!floor) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_NOT_FOUND,
      );
    }

    const resolvedBuildingId = floor.building.building_id;

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      floor.building.organization.organization_id,
    );

    const limit = this.resolveMapLimit(options.limit);
    const viewport = options.viewport;
    const isLod = this.isLodViewport(viewport);
    const zonesPage = await this.loadVisibleZonesPage(
      resolvedBuildingId,
      floorId,
      limit,
      options.cursor,
      viewport,
    );
    const zones = zonesPage.items;
    const transitionValidationZones = await this.loadTransitionValidationZones(
      resolvedBuildingId,
      limit,
      viewport,
    );
    const visibleZoneIds = new Set(zones.map((zone) => zone.zone_id));
    const transitionValidationZoneIds = new Set(
      transitionValidationZones.map((zone) => zone.zone_id),
    );
    const [doors, transitionValidationDoors, zoneClusters] = await Promise.all([
      this.loadDoorsForZoneIds(floorId, [...visibleZoneIds]),
      this.loadDoorsForZoneIds(
        null,
        [...transitionValidationZoneIds],
        resolvedBuildingId,
      ),
      isLod && viewport
        ? this.loadZoneClusters(resolvedBuildingId, floorId, viewport)
        : Promise.resolve([]),
    ]);
    const deletableZoneIds = await this.getDeletableZoneIds(
      zones,
      resolvedBuildingId,
    );
    const deletableDoorIds = await this.getDeletableDoorIds(
      doors,
      resolvedBuildingId,
    );
    const mapMeta: FloorMapMeta = {
      limit,
      next_cursor: zonesPage.nextCursor,
      has_more: zonesPage.hasMore,
      is_lod: isLod,
    };

    return {
      zones,
      doors,
      transitionValidationZones,
      transitionValidationDoors,
      deletableZoneIds,
      deletableDoorIds,
      mapMeta,
      zoneClusters,
    };
  }

  async getBuildingMapSeed(
    userId: number,
    buildingId: number | null,
    floorId: number,
  ): Promise<MapSeed> {
    const floor = await this.floorRepository.findOne({
      where:
        buildingId === null
          ? { floor_id: floorId }
          : { floor_id: floorId, building: { building_id: buildingId } },
      relations: ['building', 'building.organization'],
    });

    if (!floor) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      floor.building.organization.organization_id,
    );

    const seedZone = await this.zoneRepository
      .createQueryBuilder('zone')
      .leftJoin('zone.floor', 'zone_floor')
      .leftJoin('zone.building', 'building')
      .where('building.building_id = :buildingId', {
        buildingId: floor.building.building_id,
      })
      .andWhere(
        '(zone_floor.floor_id = :floorId OR zone.is_transition_between_floors = true)',
        {
          floorId,
        },
      )
      .orderBy('zone.zone_id', 'ASC')
      .getOne();

    if (!seedZone) {
      return {
        viewport: {
          x: 0,
          y: 0,
          width: this.getPositiveNumberConfig('MAP_EMPTY_VIEWPORT_WIDTH'),
          height: this.getPositiveNumberConfig('MAP_EMPTY_VIEWPORT_HEIGHT'),
        },
      };
    }

    const padding = this.getPositiveNumberConfig('MAP_SEED_VIEWPORT_PADDING');
    return {
      viewport: {
        x: seedZone.x_coordinate - padding,
        y: seedZone.y_coordinate - padding,
        width: seedZone.width + padding * 2,
        height: seedZone.height + padding * 2,
      },
    };
  }

  private resolveMapLimit(requestedLimit?: number): number {
    const configuredLimit = this.getPositiveNumberConfig(
      'MAP_VIEWPORT_ZONE_LIMIT',
    );

    return requestedLimit && requestedLimit > 0
      ? Math.min(requestedLimit, configuredLimit)
      : configuredLimit;
  }

  private isLodViewport(viewport?: ViewportBounds): boolean {
    if (!viewport) return false;

    const threshold = this.getPositiveNumberConfig(
      'MAP_VIEWPORT_LOD_AREA_THRESHOLD',
    );

    return viewport.width * viewport.height >= threshold;
  }

  private applyViewportFilter<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    alias: string,
    viewport?: ViewportBounds,
  ): SelectQueryBuilder<T> {
    if (!viewport) return query;

    return query
      .andWhere(`${alias}.x_coordinate < :viewportRight`, {
        viewportRight: viewport.x + viewport.width,
      })
      .andWhere(`${alias}.x_coordinate + ${alias}.width > :viewportX`, {
        viewportX: viewport.x,
      })
      .andWhere(`${alias}.y_coordinate < :viewportBottom`, {
        viewportBottom: viewport.y + viewport.height,
      })
      .andWhere(`${alias}.y_coordinate + ${alias}.height > :viewportY`, {
        viewportY: viewport.y,
      });
  }

  private async loadVisibleZonesPage(
    buildingId: number,
    floorId: number,
    limit: number,
    cursor?: number,
    viewport?: ViewportBounds,
  ) {
    let query = this.zoneRepository
      .createQueryBuilder('zone')
      .leftJoinAndSelect('zone.floor', 'floor')
      .leftJoin('zone.building', 'building')
      .where('building.building_id = :buildingId', { buildingId })
      .andWhere(
        '(floor.floor_id = :floorId OR zone.is_transition_between_floors = true)',
        {
          floorId,
        },
      );

    query = this.applyViewportFilter(query, 'zone', viewport);

    if (cursor && cursor > 0) {
      query.andWhere('zone.zone_id > :cursor', { cursor });
    }

    const items = await query
      .orderBy('zone.zone_id', 'ASC')
      .take(limit + 1)
      .getMany();
    const hasMore = items.length > limit;
    const visibleItems = hasMore ? items.slice(0, limit) : items;

    return {
      items: visibleItems,
      hasMore,
      nextCursor: hasMore
        ? visibleItems[visibleItems.length - 1].zone_id
        : null,
    };
  }

  private async loadTransitionValidationZones(
    buildingId: number,
    limit: number,
    viewport?: ViewportBounds,
  ): Promise<Zone[]> {
    let query = this.zoneRepository
      .createQueryBuilder('zone')
      .leftJoinAndSelect('zone.floor', 'floor')
      .leftJoin('zone.building', 'building')
      .where('building.building_id = :buildingId', { buildingId });

    query = this.applyViewportFilter(query, 'zone', viewport);

    return query.orderBy('zone.zone_id', 'ASC').take(limit).getMany();
  }

  private async loadDoorsForZoneIds(
    floorId: number | null,
    zoneIds: number[],
    buildingId?: number,
  ): Promise<Door[]> {
    if (zoneIds.length === 0) return [];

    const query = this.dataSource
      .getRepository(Door)
      .createQueryBuilder('door')
      .leftJoinAndSelect('door.zone_from', 'zone_from')
      .leftJoinAndSelect('door.zone_to', 'zone_to')
      .leftJoinAndSelect('door.floor', 'floor')
      .leftJoinAndSelect('door.rfid_reader', 'rfid_reader')
      .where(
        '(zone_from.zone_id IN (:...zoneIds) OR zone_to.zone_id IN (:...zoneIds))',
        {
          zoneIds,
        },
      );

    if (floorId !== null) {
      query.andWhere('floor.floor_id = :floorId', { floorId });
    }

    if (buildingId !== undefined) {
      query
        .leftJoin('floor.building', 'building')
        .andWhere('building.building_id = :buildingId', { buildingId });
    }

    return query.orderBy('door.door_id', 'ASC').getMany();
  }

  private async loadZoneClusters(
    buildingId: number,
    floorId: number,
    viewport: ViewportBounds,
  ) {
    const clusterSize = this.getPositiveNumberConfig(
      'MAP_VIEWPORT_LOD_CLUSTER_SIZE',
    );

    const rows = await this.zoneRepository
      .createQueryBuilder('zone')
      .leftJoin('zone.floor', 'floor')
      .leftJoin('zone.building', 'building')
      .select(
        `FLOOR(zone.x_coordinate / :clusterSize) * :clusterSize`,
        'x_coordinate',
      )
      .addSelect(
        `FLOOR(zone.y_coordinate / :clusterSize) * :clusterSize`,
        'y_coordinate',
      )
      .addSelect('COUNT(zone.zone_id)', 'zones_count')
      .where('building.building_id = :buildingId', { buildingId })
      .andWhere(
        '(floor.floor_id = :floorId OR zone.is_transition_between_floors = true)',
        {
          floorId,
        },
      )
      .andWhere('zone.x_coordinate < :viewportRight', {
        viewportRight: viewport.x + viewport.width,
      })
      .andWhere('zone.x_coordinate + zone.width > :viewportX', {
        viewportX: viewport.x,
      })
      .andWhere('zone.y_coordinate < :viewportBottom', {
        viewportBottom: viewport.y + viewport.height,
      })
      .andWhere('zone.y_coordinate + zone.height > :viewportY', {
        viewportY: viewport.y,
      })
      .setParameter('clusterSize', clusterSize)
      .groupBy('FLOOR(zone.x_coordinate / :clusterSize)')
      .addGroupBy('FLOOR(zone.y_coordinate / :clusterSize)')
      .orderBy('x_coordinate', 'ASC')
      .addOrderBy('y_coordinate', 'ASC')
      .getRawMany<{
        x_coordinate: string;
        y_coordinate: string;
        zones_count: string;
      }>();

    return rows.map((row) => ({
      x_coordinate: Number(row.x_coordinate),
      y_coordinate: Number(row.y_coordinate),
      width: clusterSize,
      height: clusterSize,
      zones_count: Number(row.zones_count),
    }));
  }

  private getPositiveNumberConfig(key: string): number {
    const value = Number(this.configService.getOrThrow<string>(key));
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${key} must be a positive number`);
    }

    return value;
  }

  private async getDeletableZoneIds(
    zones: Zone[],
    buildingId: number,
  ): Promise<number[]> {
    const deletableZoneIds: number[] = [];
    for (const zone of zones) {
      try {
        await this.validateZoneDeletion(zone.zone_id, buildingId);
        deletableZoneIds.push(zone.zone_id);
      } catch {
        // The map only needs to know whether the delete action is available.
      }
    }
    return deletableZoneIds;
  }

  private async getDeletableDoorIds(
    doors: Door[],
    buildingId: number,
  ): Promise<number[]> {
    const totalEntranceDoors =
      await this.countEntranceDoorsInBuilding(buildingId);
    const deletableDoorIds: number[] = [];

    for (const door of doors) {
      if (door.is_entrance) {
        if (totalEntranceDoors > 1) deletableDoorIds.push(door.door_id);
        continue;
      }

      if (!door.zone_from) continue;

      if (
        await this.canDeleteRegularDoorWithoutDisconnectingBuilding(
          door.door_id,
          buildingId,
        )
      ) {
        deletableDoorIds.push(door.door_id);
      }
    }

    return deletableDoorIds;
  }

  async deleteZone(userId: number, zoneId: number): Promise<void> {
    const zone = await this.zoneRepository.findOne({
      where: { zone_id: zoneId },
      relations: ['building', 'building.organization'],
    });

    if (!zone) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.ZONE_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    const buildingId = zone.building.building_id;
    await this.validateZoneDeletion(zoneId, buildingId);

    if (zone.photo) {
      await this.deletePhotoFile(zone.photo);
    }

    await this.zoneRepository.delete(zoneId);
  }

  private async validateZoneDeletion(
    zoneId: number,
    buildingId: number,
  ): Promise<void> {
    const doorRepository = this.dataSource.getRepository(Door);

    const entranceDoorsInZone = await doorRepository.count({
      where: {
        zone_to: { zone_id: zoneId },
        is_entrance: true,
      },
    });

    if (entranceDoorsInZone > 0) {
      const totalEntranceDoors =
        await this.countEntranceDoorsInBuilding(buildingId);

      if (entranceDoorsInZone === totalEntranceDoors) {
        throw new BadRequestException(
          BUILDINGS_CONSTANTS.ERROR_MESSAGES.CANNOT_DELETE_ZONE_WITH_LAST_ENTRANCE_DOOR,
        );
      }
    }

    const connectedDoors = await doorRepository.find({
      where: [
        { zone_from: { zone_id: zoneId }, is_entrance: false },
        { zone_to: { zone_id: zoneId }, is_entrance: false },
      ],
      relations: ['zone_from', 'zone_to', 'floor'],
    });

    const adjacentZonesByFloor = new Map<number, Set<number>>();

    for (const door of connectedDoors) {
      const otherZoneId =
        door.zone_from?.zone_id === zoneId
          ? door.zone_to.zone_id
          : door.zone_from!.zone_id;

      if (!adjacentZonesByFloor.has(door.floor.floor_id)) {
        adjacentZonesByFloor.set(door.floor.floor_id, new Set());
      }
      adjacentZonesByFloor.get(door.floor.floor_id)!.add(otherZoneId);
    }

    for (const [floorId, adjacentZones] of adjacentZonesByFloor) {
      const adjacentZoneIds = Array.from(adjacentZones);

      for (let i = 0; i < adjacentZoneIds.length; i++) {
        for (let j = i + 1; j < adjacentZoneIds.length; j++) {
          const zone1Id = adjacentZoneIds[i];
          const zone2Id = adjacentZoneIds[j];

          const doorsCount =
            await this.doorManagementService.countDoorsBetweenZones(
              zone1Id,
              zone2Id,
              floorId,
            );

          if (doorsCount === 0) {
            const zone1 = await this.zoneRepository.findOne({
              where: { zone_id: zone1Id },
            });
            const zone2 = await this.zoneRepository.findOne({
              where: { zone_id: zone2Id },
            });

            throw new BadRequestException(
              BUILDINGS_CONSTANTS.ERROR_MESSAGES.CANNOT_DELETE_ZONE_WOULD_DISCONNECT_ZONES(
                zone1!.title,
                zone2!.title,
              ),
            );
          }
        }
      }
    }
  }

  async assignReaderToDoor(
    userId: number,
    doorId: number,
    rfidReaderId: number,
  ): Promise<void> {
    const door = await this.dataSource.getRepository(Door).findOne({
      where: { door_id: doorId },
      relations: [
        'zone_to',
        'zone_to.building',
        'zone_to.building.organization',
        'rfid_reader',
      ],
    });

    if (!door) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.DOOR_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      door.zone_to.building.organization.organization_id,
    );

    if (door.rfid_reader) {
      throw new ConflictException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.DOOR_ALREADY_HAS_READER,
      );
    }

    const reader = await this.dataSource.getRepository(RfidReader).findOne({
      where: { rfid_reader_id: rfidReaderId },
      relations: ['organization'],
    });

    if (!reader) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.RFID_READER_NOT_FOUND,
      );
    }

    if (
      reader.organization.organization_id !==
      door.zone_to.building.organization.organization_id
    ) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.READER_ORGANIZATION_MISMATCH,
      );
    }

    const existingDoor = await this.dataSource.getRepository(Door).findOne({
      where: { rfid_reader: { rfid_reader_id: rfidReaderId } },
    });

    if (existingDoor) {
      throw new ConflictException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.READER_ALREADY_ASSIGNED,
      );
    }

    door.rfid_reader = reader;
    await this.dataSource.getRepository(Door).save(door);
  }

  async removeReaderFromDoor(userId: number, doorId: number): Promise<void> {
    const door = await this.dataSource.getRepository(Door).findOne({
      where: { door_id: doorId },
      relations: [
        'zone_to',
        'zone_to.building',
        'zone_to.building.organization',
        'rfid_reader',
      ],
    });

    if (!door) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.DOOR_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      door.zone_to.building.organization.organization_id,
    );

    if (!door.rfid_reader) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.DOOR_HAS_NO_READER,
      );
    }

    door.rfid_reader = null;
    await this.dataSource.getRepository(Door).save(door);
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

  async deleteBuilding(userId: number, buildingId: number): Promise<void> {
    const building = await this.buildingRepository.findOne({
      where: { building_id: buildingId },
      relations: ['organization'],
    });

    if (!building) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.BUILDING_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      building.organization.organization_id,
    );

    await this.buildingRepository.remove(building);
  }

  async getCurrentEmployeeLocations(
    userId: number,
    buildingId: number | null,
    floorId: number,
    viewport?: ViewportBounds,
  ) {
    const floor = await this.floorRepository.findOne({
      where:
        buildingId === null
          ? { floor_id: floorId }
          : { floor_id: floorId, building: { building_id: buildingId } },
      relations: ['building', 'building.organization'],
    });

    if (!floor) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_NOT_FOUND,
      );
    }

    const resolvedBuildingId = floor.building.building_id;

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      floor.building.organization.organization_id,
    );

    const visibleZones = this.filterZonesByViewport(
      await this.zoneGeometryService.loadZonesForBuilding(
        resolvedBuildingId,
        floorId,
        true,
      ),
      viewport,
    );
    const visibleZoneIds = new Set(visibleZones.map((zone) => zone.zone_id));
    if (visibleZoneIds.size === 0) {
      return [];
    }

    const employees = await this.dataSource
      .getRepository(Employee)
      .createQueryBuilder('employee')
      .innerJoin(
        'employee.organizations',
        'organization',
        'organization.organization_id = :organizationId',
        { organizationId: floor.building.organization.organization_id },
      )
      .select([
        'employee.employee_id',
        'employee.full_name',
        'employee.email',
        'employee.photo',
      ])
      .getMany();

    if (employees.length === 0) {
      return [];
    }

    const cacheKeys = employees.map((employee) =>
      SCAN_STATE_CACHE_CONSTANTS.KEYS.CURRENT_ZONE(employee.employee_id),
    );
    const currentZoneByCacheKey = await this.redisService.getStrings(cacheKeys);

    return employees
      .map((employee) => {
        const cachedZoneId = currentZoneByCacheKey.get(
          SCAN_STATE_CACHE_CONSTANTS.KEYS.CURRENT_ZONE(employee.employee_id),
        );
        if (
          cachedZoneId === undefined ||
          cachedZoneId === null ||
          cachedZoneId === 'null'
        ) {
          return null;
        }

        const zoneId = Number(cachedZoneId);
        if (!Number.isFinite(zoneId) || !visibleZoneIds.has(zoneId)) {
          return null;
        }

        return {
          employee_id: employee.employee_id,
          zone_id: zoneId,
          full_name: employee.full_name,
          email: employee.email,
          photo: employee.photo,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async getCurrentBuildingEmployees(
    userId: number,
    buildingId: number,
    search: string = '',
    offset: number = 0,
    limit: number = 20,
  ) {
    const building = await this.buildingRepository.findOne({
      where: { building_id: buildingId },
      relations: ['organization'],
    });

    if (!building) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.BUILDING_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      building.organization.organization_id,
    );

    const doorRepository = this.dataSource.getRepository(Door);
    const scanEventRepository = this.dataSource.getRepository(ScanEvent);
    const doors = await doorRepository.find({
      where: { floor: { building: { building_id: buildingId } } },
      relations: ['rfid_reader', 'zone_from', 'zone_to', 'zone_to.floor'],
    });
    const readerIds = doors
      .map((door) => door.rfid_reader?.rfid_reader_id)
      .filter((id): id is number => id !== undefined);

    if (readerIds.length === 0) {
      return { items: [], total: 0, offset, limit };
    }

    const scans = await scanEventRepository
      .createQueryBuilder('scan_event')
      .leftJoinAndSelect('scan_event.rfid_tag', 'rfid_tag')
      .leftJoinAndSelect('rfid_tag.tag_assignments', 'tag_assignment')
      .leftJoinAndSelect('tag_assignment.employee', 'employee')
      .leftJoinAndSelect('scan_event.rfid_reader', 'rfid_reader')
      .where('rfid_reader.rfid_reader_id IN (:...readerIds)', { readerIds })
      .orderBy('scan_event.created_at', 'ASC')
      .getMany();

    const employeeScansMap = new Map<number, ScanEvent[]>();
    const employeesMap = new Map<number, Employee>();
    const latestScanAtMap = new Map<number, Date>();
    const doorMap = new Map(
      doors.map((door) => [door.rfid_reader?.rfid_reader_id, door]),
    );

    for (const scan of scans) {
      const assignment = scan.rfid_tag.tag_assignments[0];
      if (!assignment?.employee) continue;

      const employeeId = assignment.employee.employee_id;
      employeesMap.set(employeeId, assignment.employee);
      latestScanAtMap.set(employeeId, scan.created_at);
      const employeeScans = employeeScansMap.get(employeeId) || [];
      employeeScans.push(scan);
      employeeScansMap.set(employeeId, employeeScans);
    }

    const items = Array.from(employeeScansMap.entries())
      .map(([employeeId, employeeScans]) => {
        let currentZoneId: number | null = null;
        let currentDoor: Door | null = null;

        for (const scan of employeeScans) {
          const door = doorMap.get(scan.rfid_reader.rfid_reader_id);
          if (!door) continue;

          currentDoor = door;
          currentZoneId = determineNewZoneById(
            currentZoneId,
            door.zone_from?.zone_id ?? null,
            door.zone_to.zone_id,
          );
        }

        const employee = employeesMap.get(employeeId);
        if (!employee || currentZoneId === null || !currentDoor) return null;
        const zone =
          currentDoor.zone_to.zone_id === currentZoneId
            ? currentDoor.zone_to
            : currentDoor.zone_from;
        if (!zone) return null;

        return {
          employee_id: employee.employee_id,
          full_name: employee.full_name,
          email: employee.email,
          phone: employee.phone,
          photo: employee.photo,
          zone_id: currentZoneId,
          zone_title: zone.title,
          floor_id: zone.floor?.floor_id ?? null,
          last_scan_at: latestScanAtMap.get(employeeId) ?? null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [
          item.full_name,
          item.email,
          item.phone || '',
          item.zone_title,
        ].some((value) => value.toLowerCase().includes(query));
      })
      .sort(
        (first, second) =>
          new Date(second.last_scan_at || 0).getTime() -
          new Date(first.last_scan_at || 0).getTime(),
      );

    return {
      items: items.slice(offset, offset + limit),
      total: items.length,
      offset,
      limit,
    };
  }

  async getCurrentFloorEmployees(
    userId: number,
    floorId: number,
    search: string = '',
    offset: number = 0,
    limit: number = 20,
  ) {
    const floor = await this.floorRepository.findOne({
      where: { floor_id: floorId },
      relations: ['building', 'building.organization'],
    });

    if (!floor) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.FLOOR_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      floor.building.organization.organization_id,
    );

    const zones = await this.zoneGeometryService.loadZonesForBuilding(
      floor.building.building_id,
      floorId,
      true,
    );
    const zonesById = new Map(zones.map((zone) => [zone.zone_id, zone]));
    if (zonesById.size === 0) {
      return { items: [], total: 0, offset, limit };
    }

    const employees = await this.dataSource
      .getRepository(Employee)
      .createQueryBuilder('employee')
      .innerJoin(
        'employee.organizations',
        'organization',
        'organization.organization_id = :organizationId',
        { organizationId: floor.building.organization.organization_id },
      )
      .select([
        'employee.employee_id',
        'employee.full_name',
        'employee.email',
        'employee.photo',
      ])
      .getMany();

    if (employees.length === 0) {
      return { items: [], total: 0, offset, limit };
    }

    const cacheKeys = employees.map((employee) =>
      SCAN_STATE_CACHE_CONSTANTS.KEYS.CURRENT_ZONE(employee.employee_id),
    );
    const currentZoneByCacheKey = await this.redisService.getStrings(cacheKeys);
    const query = search.trim().toLowerCase();

    const items = employees
      .map((employee) => {
        const cachedZoneId = currentZoneByCacheKey.get(
          SCAN_STATE_CACHE_CONSTANTS.KEYS.CURRENT_ZONE(employee.employee_id),
        );
        if (
          cachedZoneId === undefined ||
          cachedZoneId === null ||
          cachedZoneId === 'null'
        ) {
          return null;
        }

        const currentZoneId = Number(cachedZoneId);
        const zone = Number.isFinite(currentZoneId)
          ? zonesById.get(currentZoneId)
          : null;
        if (!zone) return null;

        const zoneFloorId = zone.floor?.floor_id ?? floorId;
        return {
          employee_id: employee.employee_id,
          full_name: employee.full_name,
          email: employee.email,
          photo: employee.photo,
          zone_id: currentZoneId,
          zone_title: zone.title,
          floor_id: zoneFloorId,
          last_scan_at: null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => {
        if (!query) return true;
        return [item.full_name, item.email, item.zone_title].some((value) =>
          value.toLowerCase().includes(query),
        );
      })
      .sort(
        (first, second) =>
          new Date(second.last_scan_at || 0).getTime() -
          new Date(first.last_scan_at || 0).getTime(),
      );

    return {
      items: items.slice(offset, offset + limit),
      total: items.length,
      offset,
      limit,
    };
  }

  private filterZonesByViewport(
    zones: Zone[],
    viewport?: ViewportBounds,
  ): Zone[] {
    if (
      !viewport ||
      viewport.x === undefined ||
      viewport.y === undefined ||
      viewport.width === undefined ||
      viewport.height === undefined
    ) {
      return zones;
    }

    const viewportRight = viewport.x + viewport.width;
    const viewportBottom = viewport.y + viewport.height;

    return zones
      .filter((zone) => {
        const zoneRight = zone.x_coordinate + zone.width;
        const zoneBottom = zone.y_coordinate + zone.height;

        const intersectsX =
          zone.x_coordinate < viewportRight && zoneRight > viewport.x;
        const intersectsY =
          zone.y_coordinate < viewportBottom && zoneBottom > viewport.y;

        return intersectsX && intersectsY;
      })
      .slice(0, BUILDINGS_CONSTANTS.MAP.MAX_VIEWPORT_ZONES);
  }

  async getEmployeeDailyMovements(
    userId: number,
    buildingId: number,
    employeeId: number,
    date: string,
  ): Promise<EmployeeDailyMovementsResponseDto> {
    const building = await this.buildingRepository.findOne({
      where: { building_id: buildingId },
      relations: ['organization'],
    });

    if (!building) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.BUILDING_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      building.organization.organization_id,
    );

    const employee = await this.dataSource.getRepository(Employee).findOne({
      where: { employee_id: employeeId },
      relations: ['organizations'],
    });

    if (!employee) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    const belongsToOrganization = employee.organizations?.some(
      (org) => org.organization_id === building.organization.organization_id,
    );

    if (!belongsToOrganization) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_IN_ORGANIZATION,
      );
    }

    const cacheKey = BUILDINGS_CONSTANTS.CACHE.DAILY_MOVEMENTS_KEY(
      buildingId,
      employeeId,
      date,
    );
    const cachedResponse =
      await this.redisService.get<EmployeeDailyMovementsResponseDto>(cacheKey);
    if (cachedResponse) return cachedResponse;

    const { startOfDay, endOfDay } = this.parseDateRange(date);

    const doors = await this.dataSource
      .getRepository(Door)
      .createQueryBuilder('door')
      .leftJoinAndSelect('door.rfid_reader', 'rfid_reader')
      .leftJoinAndSelect('door.zone_from', 'zone_from')
      .leftJoinAndSelect('door.zone_to', 'zone_to')
      .leftJoinAndSelect('door.floor', 'floor')
      .leftJoinAndSelect('floor.building', 'building')
      .where('building.building_id = :buildingId', { buildingId })
      .getMany();

    const readerIds = doors
      .map((door) => door.rfid_reader?.rfid_reader_id)
      .filter((id): id is number => id !== undefined);

    if (readerIds.length === 0) {
      const emptyResponse = BuildingsMovementsMapper.toDailyMovementsResponse(
        employee,
        [],
        [],
      );
      await this.redisService.set(
        cacheKey,
        emptyResponse,
        BUILDINGS_CONSTANTS.CACHE.DAILY_MOVEMENTS_TTL_SECONDS,
      );
      return emptyResponse;
    }

    const scans = await this.dataSource
      .getRepository(ScanEvent)
      .createQueryBuilder('scan_event')
      .leftJoinAndSelect('scan_event.rfid_tag', 'rfid_tag')
      .leftJoin('rfid_tag.tag_assignments', 'tag_assignment')
      .leftJoinAndSelect('scan_event.rfid_reader', 'rfid_reader')
      .where('tag_assignment.employee_id = :employeeId', { employeeId })
      .andWhere('scan_event.created_at >= :startOfDay', { startOfDay })
      .andWhere('scan_event.created_at <= :endOfDay', { endOfDay })
      .andWhere('rfid_reader.rfid_reader_id IN (:...readerIds)', { readerIds })
      .orderBy('scan_event.created_at', 'ASC')
      .getMany();

    const doorMap = new Map(
      doors
        .filter((door) => door.rfid_reader?.rfid_reader_id)
        .map((door) => [door.rfid_reader!.rfid_reader_id, door]),
    );

    let currentZoneId: number | null = null;
    const movements: EmployeeMovementItemDto[] = [];

    for (const scan of scans) {
      const readerId = scan.rfid_reader?.rfid_reader_id;
      if (!readerId) continue;

      const door = doorMap.get(readerId);
      if (!door) continue;

      const zoneFromId = door.zone_from?.zone_id ?? null;
      const zoneToId = door.zone_to.zone_id;

      const nextZoneId = determineNewZoneById(
        currentZoneId,
        zoneFromId,
        zoneToId,
      );

      movements.push(
        BuildingsMovementsMapper.toMovementItem(
          scan.scan_event_id,
          scan.created_at,
          door.door_id,
          door.floor.floor_id,
          currentZoneId,
          nextZoneId,
        ),
      );

      currentZoneId = nextZoneId;
    }

    const violations = await this.dataSource
      .getRepository(Notification)
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.zone', 'zone')
      .leftJoinAndSelect('zone.floor', 'zone_floor')
      .leftJoinAndSelect('zone.building', 'building')
      .where('notification.employee_id = :employeeId', { employeeId })
      .andWhere('notification.created_at >= :startOfDay', { startOfDay })
      .andWhere('notification.created_at <= :endOfDay', { endOfDay })
      .andWhere('building.building_id = :buildingId', { buildingId })
      .orderBy('notification.created_at', 'ASC')
      .getMany();

    const response = BuildingsMovementsMapper.toDailyMovementsResponse(
      employee,
      movements,
      violations.map((notification) =>
        BuildingsMovementsMapper.toViolation(notification),
      ),
    );
    await this.redisService.set(
      cacheKey,
      response,
      BUILDINGS_CONSTANTS.CACHE.DAILY_MOVEMENTS_TTL_SECONDS,
    );
    return response;
  }

  private parseDateRange(date: string): { startOfDay: Date; endOfDay: Date } {
    const match = BUILDINGS_CONSTANTS.DATE.FORMAT_REGEX.exec(date);
    if (!match) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.INVALID_DATE,
      );
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const startOfDay = new Date(
      year,
      month - 1,
      day,
      BUILDINGS_CONSTANTS.DATE.START_HOUR,
      BUILDINGS_CONSTANTS.DATE.START_MINUTE,
      BUILDINGS_CONSTANTS.DATE.START_SECOND,
      BUILDINGS_CONSTANTS.DATE.START_MILLISECOND,
    );
    if (Number.isNaN(startOfDay.getTime())) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.INVALID_DATE,
      );
    }

    const endOfDay = new Date(
      year,
      month - 1,
      day,
      BUILDINGS_CONSTANTS.DATE.END_HOUR,
      BUILDINGS_CONSTANTS.DATE.END_MINUTE,
      BUILDINGS_CONSTANTS.DATE.END_SECOND,
      BUILDINGS_CONSTANTS.DATE.END_MILLISECOND,
    );

    return { startOfDay, endOfDay };
  }
}
