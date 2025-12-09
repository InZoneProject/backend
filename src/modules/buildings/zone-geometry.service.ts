import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Zone } from './entities/zone.entity';
import { Door } from './entities/door.entity';
import { ZoneGeometryValidator } from './zone-geometry.validator';
import { BUILDINGS_CONSTANTS } from './buildings.constants';
import { UpdateZoneGeometryDto } from './dto/update-zone-geometry.dto';
import { DoorSide } from './enums/door-side.enum';
import { Dimension } from './enums/dimension.enum';

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CoordinatesMap = Map<number, Rectangle>;

@Injectable()
export class ZoneGeometryService {
  constructor(
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
    private readonly zoneGeometryValidator: ZoneGeometryValidator,
  ) {}

  async loadZonesForBuilding(
    buildingId: number,
    floorId?: number,
    includeTransition = true,
  ): Promise<Zone[]> {
    if (floorId === undefined) {
      return this.zoneRepository.find({
        where: { building: { building_id: buildingId } },
        relations: ['floor'],
      });
    }

    if (!includeTransition) {
      return this.zoneRepository.find({
        where: {
          building: { building_id: buildingId },
          floor: { floor_id: floorId },
        },
        relations: ['floor'],
      });
    }

    const [floorZones, transitionZones] = await Promise.all([
      this.zoneRepository.find({
        where: {
          building: { building_id: buildingId },
          floor: { floor_id: floorId },
        },
        relations: ['floor'],
      }),
      this.zoneRepository.find({
        where: {
          building: { building_id: buildingId },
          is_transition_between_floors: true,
        },
        relations: ['floor'],
      }),
    ]);

    return [...floorZones, ...transitionZones];
  }

  findIntersectingZones(newZone: Rectangle, existingZones: Zone[]): Zone[] {
    return existingZones.filter((zone) => {
      const intersection = this.zoneGeometryValidator.calculateIntersection(
        newZone,
        {
          x: zone.x_coordinate,
          y: zone.y_coordinate,
          width: zone.width,
          height: zone.height,
        },
      );

      return (
        intersection.hasIntersection &&
        intersection.intersectionLength >=
          BUILDINGS_CONSTANTS.ZONE.MIN_INTERSECTION
      );
    });
  }

  createCoordinatesMap(zones: Zone[]): CoordinatesMap {
    const map = new Map<number, Rectangle>();
    zones.forEach((zone) => {
      map.set(zone.zone_id, {
        x: zone.x_coordinate,
        y: zone.y_coordinate,
        width: zone.width,
        height: zone.height,
      });
    });
    return map;
  }

  findConnectedZones(
    zoneId: number,
    allDoors: Door[],
    allZones: Zone[],
    coordinatesMap?: CoordinatesMap,
  ): Zone[] {
    const connectedZoneIds = new Set<number>();

    for (const door of allDoors) {
      if (door.is_entrance || !door.zone_from || !door.zone_to) {
        continue;
      }

      if (coordinatesMap) {
        const zone1Coords = coordinatesMap.get(door.zone_from.zone_id);
        const zone2Coords = coordinatesMap.get(door.zone_to.zone_id);

        if (zone1Coords && zone2Coords) {
          const intersection = this.zoneGeometryValidator.calculateIntersection(
            zone1Coords,
            zone2Coords,
          );

          if (!intersection.hasIntersection) {
            continue;
          }
        }
      }

      if (door.zone_from.zone_id === zoneId) {
        connectedZoneIds.add(door.zone_to.zone_id);
      } else if (door.zone_to.zone_id === zoneId) {
        connectedZoneIds.add(door.zone_from.zone_id);
      }
    }

    return allZones.filter((z) => connectedZoneIds.has(z.zone_id));
  }

  async updateZoneGeometry(
    zone: Zone,
    updateDto: UpdateZoneGeometryDto,
    manager: EntityManager,
  ): Promise<Zone> {
    this.validateUpdateDto(updateDto);

    const buildingId = zone.building.building_id;
    const allZones = await this.loadZonesForBuilding(buildingId);
    const allDoors = await this.loadDoorsForBuilding(buildingId, manager);

    const coordinatesMap = this.createCoordinatesMap(allZones);
    const deltas = this.calculateDeltas(zone, updateDto);

    this.validateCoordinateAndSizeCombination(deltas);

    this.applyGeometryChanges(
      zone.zone_id,
      deltas,
      allZones,
      allDoors,
      coordinatesMap,
    );

    await this.validateGeometryChanges(zone, allZones, coordinatesMap, manager);
    await this.saveUpdatedZones(allZones, coordinatesMap, manager);

    const updatedZone = await manager.findOne(Zone, {
      where: { zone_id: zone.zone_id },
    });

    if (!updatedZone) {
      throw new NotFoundException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.ZONE_NOT_FOUND,
      );
    }

    return updatedZone;
  }

  private validateUpdateDto(updateDto: UpdateZoneGeometryDto): void {
    if (
      updateDto.width === undefined &&
      updateDto.height === undefined &&
      updateDto.x_coordinate === undefined &&
      updateDto.y_coordinate === undefined
    ) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.AT_LEAST_ONE_PARAMETER_REQUIRED,
      );
    }
  }

  private calculateDeltas(
    zone: Zone,
    updateDto: UpdateZoneGeometryDto,
  ): {
    deltaX: number;
    deltaY: number;
    deltaWidth: number;
    deltaHeight: number;
    newX: number;
    newY: number;
    newWidth: number;
    newHeight: number;
  } {
    const newX = updateDto.x_coordinate ?? zone.x_coordinate;
    const newY = updateDto.y_coordinate ?? zone.y_coordinate;
    const newWidth = updateDto.width ?? zone.width;
    const newHeight = updateDto.height ?? zone.height;

    return {
      deltaX: newX - zone.x_coordinate,
      deltaY: newY - zone.y_coordinate,
      deltaWidth: newWidth - zone.width,
      deltaHeight: newHeight - zone.height,
      newX,
      newY,
      newWidth,
      newHeight,
    };
  }

  private validateCoordinateAndSizeCombination(deltas: {
    deltaX: number;
    deltaY: number;
    deltaWidth: number;
    deltaHeight: number;
  }): void {
    if (deltas.deltaX !== 0) {
      const requiredWidthChange =
        deltas.deltaX < 0 ? Math.abs(deltas.deltaX) : -deltas.deltaX;
      if (
        (deltas.deltaX < 0 && deltas.deltaWidth < requiredWidthChange) ||
        (deltas.deltaX > 0 && deltas.deltaWidth > requiredWidthChange)
      ) {
        throw new BadRequestException(
          BUILDINGS_CONSTANTS.ERROR_MESSAGES.COORDINATE_SIZE_MISMATCH_X(
            deltas.deltaX,
            requiredWidthChange,
            deltas.deltaWidth,
          ),
        );
      }
    }

    if (deltas.deltaY !== 0) {
      const requiredHeightChange =
        deltas.deltaY < 0 ? Math.abs(deltas.deltaY) : -deltas.deltaY;
      if (
        (deltas.deltaY < 0 && deltas.deltaHeight < requiredHeightChange) ||
        (deltas.deltaY > 0 && deltas.deltaHeight > requiredHeightChange)
      ) {
        throw new BadRequestException(
          BUILDINGS_CONSTANTS.ERROR_MESSAGES.COORDINATE_SIZE_MISMATCH_Y(
            deltas.deltaY,
            requiredHeightChange,
            deltas.deltaHeight,
          ),
        );
      }
    }
  }

  private applyGeometryChanges(
    targetZoneId: number,
    deltas: ReturnType<typeof this.calculateDeltas>,
    allZones: Zone[],
    allDoors: Door[],
    coordinatesMap: CoordinatesMap,
  ): void {
    const targetCoords = coordinatesMap.get(targetZoneId)!;

    if (deltas.deltaX !== 0) {
      this.applyCoordinateChange(
        targetZoneId,
        Dimension.X,
        deltas.deltaX,
        allZones,
        allDoors,
        coordinatesMap,
      );
      targetCoords.x = deltas.newX;
    }

    if (deltas.deltaWidth !== 0) {
      this.applyCoordinateChange(
        targetZoneId,
        Dimension.WIDTH,
        deltas.deltaWidth,
        allZones,
        allDoors,
        coordinatesMap,
      );
      targetCoords.width = deltas.newWidth;
    }

    if (deltas.deltaY !== 0) {
      this.applyCoordinateChange(
        targetZoneId,
        Dimension.Y,
        deltas.deltaY,
        allZones,
        allDoors,
        coordinatesMap,
      );
      targetCoords.y = deltas.newY;
    }

    if (deltas.deltaHeight !== 0) {
      this.applyCoordinateChange(
        targetZoneId,
        Dimension.HEIGHT,
        deltas.deltaHeight,
        allZones,
        allDoors,
        coordinatesMap,
      );
      targetCoords.height = deltas.newHeight;
    }
  }

  private applyCoordinateChange(
    zoneId: number,
    dimension: Dimension,
    delta: number,
    allZones: Zone[],
    allDoors: Door[],
    coordinatesMap: CoordinatesMap,
  ): void {
    const affectedZones = this.findAffectedZones(
      zoneId,
      dimension,
      allDoors,
      allZones,
      coordinatesMap,
    );

    for (const zone of affectedZones) {
      const coords = coordinatesMap.get(zone.zone_id)!;
      if (dimension === Dimension.X || dimension === Dimension.WIDTH) {
        coords.x += delta;
      } else {
        coords.y += delta;
      }
    }
  }

  private findAffectedZones(
    zoneId: number,
    dimension: Dimension,
    allDoors: Door[],
    allZones: Zone[],
    coordinatesMap: CoordinatesMap,
  ): Zone[] {
    const predicate = this.getPositionPredicate(dimension);
    return this.findZonesByPosition(
      zoneId,
      predicate,
      allDoors,
      allZones,
      coordinatesMap,
    );
  }

  private getPositionPredicate(
    dimension: Dimension,
  ): (targetCoords: Rectangle, zoneCoords: Rectangle) => boolean {
    switch (dimension) {
      case Dimension.X:
        return (targetCoords: Rectangle, zoneCoords: Rectangle) =>
          this.isZoneOnLeft(targetCoords, zoneCoords);
      case Dimension.WIDTH:
        return (targetCoords: Rectangle, zoneCoords: Rectangle) =>
          this.isZoneOnRight(targetCoords, zoneCoords);
      case Dimension.Y:
        return (targetCoords: Rectangle, zoneCoords: Rectangle) =>
          this.isZoneOnBottom(targetCoords, zoneCoords);
      case Dimension.HEIGHT:
        return (targetCoords: Rectangle, zoneCoords: Rectangle) =>
          this.isZoneOnTop(targetCoords, zoneCoords);
    }
  }

  private findZonesByPosition(
    zoneId: number,
    predicate: (targetCoords: Rectangle, zoneCoords: Rectangle) => boolean,
    allDoors: Door[],
    allZones: Zone[],
    coordinatesMap: CoordinatesMap,
  ): Zone[] {
    const targetCoords = coordinatesMap.get(zoneId)!;
    const result: Zone[] = [];
    const visited = new Set<number>([zoneId]);

    const connectedToTarget = this.findConnectedZones(
      zoneId,
      allDoors,
      allZones,
      coordinatesMap,
    );

    const firstLevelZones: Zone[] = [];
    for (const zone of connectedToTarget) {
      const zoneCoords = coordinatesMap.get(zone.zone_id)!;
      if (predicate(targetCoords, zoneCoords)) {
        visited.add(zone.zone_id);
        firstLevelZones.push(zone);
        result.push(zone);
      }
    }

    const queue: number[] = firstLevelZones.map((z) => z.zone_id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const connectedZones = this.findConnectedZones(
        currentId,
        allDoors,
        allZones,
        coordinatesMap,
      );

      for (const zone of connectedZones) {
        if (visited.has(zone.zone_id)) continue;

        visited.add(zone.zone_id);
        result.push(zone);
        queue.push(zone.zone_id);
      }
    }

    return result;
  }

  private isZoneOnLeft(
    targetCoords: Rectangle,
    zoneCoords: Rectangle,
  ): boolean {
    return zoneCoords.x + zoneCoords.width <= targetCoords.x;
  }

  private isZoneOnRight(
    targetCoords: Rectangle,
    zoneCoords: Rectangle,
  ): boolean {
    return zoneCoords.x >= targetCoords.x + targetCoords.width;
  }

  private isZoneOnBottom(
    targetCoords: Rectangle,
    zoneCoords: Rectangle,
  ): boolean {
    return zoneCoords.y + zoneCoords.height <= targetCoords.y;
  }

  private isZoneOnTop(targetCoords: Rectangle, zoneCoords: Rectangle): boolean {
    return zoneCoords.y >= targetCoords.y + targetCoords.height;
  }

  private async loadDoorsForBuilding(
    buildingId: number,
    manager: EntityManager,
  ): Promise<Door[]> {
    return manager.find(Door, {
      where: { floor: { building: { building_id: buildingId } } },
      relations: ['zone_from', 'zone_to', 'floor'],
    });
  }

  private async saveUpdatedZones(
    zones: Zone[],
    coordinatesMap: CoordinatesMap,
    manager: EntityManager,
  ): Promise<void> {
    for (const zone of zones) {
      const coords = coordinatesMap.get(zone.zone_id)!;
      await manager.update(Zone, zone.zone_id, {
        x_coordinate: coords.x,
        y_coordinate: coords.y,
        width: coords.width,
        height: coords.height,
      });
    }
  }

  private async validateGeometryChanges(
    targetZone: Zone,
    allZones: Zone[],
    coordinatesMap: CoordinatesMap,
    manager: EntityManager,
  ): Promise<void> {
    const buildingId = targetZone.building.building_id;
    const allDoors = await this.loadDoorsForBuilding(buildingId, manager);

    this.validateExistingDoorConnections(allDoors, coordinatesMap);
    this.validateEntranceDoors(allDoors, allZones, coordinatesMap);
    this.validateNoZoneOverlap(targetZone, allZones, coordinatesMap);
  }

  private validateNoZoneOverlap(
    targetZone: Zone,
    allZones: Zone[],
    coordinatesMap: CoordinatesMap,
  ): void {
    const targetCoords = coordinatesMap.get(targetZone.zone_id);
    if (!targetCoords) return;

    const zonesToCheck = allZones.filter((z) => {
      if (z.zone_id === targetZone.zone_id) return false;
      if (targetZone.is_transition_between_floors) return true;
      if (z.is_transition_between_floors) return true;
      if (targetZone.floor && z.floor) {
        return targetZone.floor.floor_id === z.floor.floor_id;
      }

      return false;
    });

    for (const otherZone of zonesToCheck) {
      const otherCoords = coordinatesMap.get(otherZone.zone_id);
      if (!otherCoords) continue;

      const overlaps = this.zoneGeometryValidator.checkOverlap(
        targetCoords,
        otherCoords,
      );

      if (overlaps) {
        throw new BadRequestException(
          BUILDINGS_CONSTANTS.ERROR_MESSAGES.ZONE_OVERLAP_WITH_ZONE(
            otherZone.title,
          ),
        );
      }
    }
  }

  private validateExistingDoorConnections(
    allDoors: Door[],
    coordinatesMap: CoordinatesMap,
  ): void {
    const doorsByZonePair = this.groupDoorsByZonePair(allDoors);

    for (const [, doors] of doorsByZonePair) {
      const firstDoor = doors[0];
      const zoneFrom = firstDoor.zone_from!;
      const zoneTo = firstDoor.zone_to;

      const zoneFromCoords = coordinatesMap.get(zoneFrom.zone_id);
      const zoneToCoords = coordinatesMap.get(zoneTo.zone_id);

      if (!zoneFromCoords || !zoneToCoords) continue;

      const intersection = this.zoneGeometryValidator.calculateIntersection(
        zoneFromCoords,
        zoneToCoords,
      );

      if (!intersection.hasIntersection) {
        throw new BadRequestException(
          BUILDINGS_CONSTANTS.ERROR_MESSAGES.CANNOT_DISCONNECT_ZONES(
            zoneTo.title,
            firstDoor.door_id,
          ),
        );
      }

      const requiredIntersection =
        doors.length * BUILDINGS_CONSTANTS.ZONE.DOOR_SIZE;
      if (intersection.intersectionLength < requiredIntersection) {
        throw new BadRequestException(
          BUILDINGS_CONSTANTS.ERROR_MESSAGES.INSUFFICIENT_SPACE_FOR_DOORS(
            doors.length,
            zoneFrom.title,
            zoneTo.title,
            requiredIntersection,
            intersection.intersectionLength,
          ),
        );
      }
    }
  }

  private validateEntranceDoors(
    allDoors: Door[],
    allZones: Zone[],
    coordinatesMap: CoordinatesMap,
  ): void {
    const entranceDoors = allDoors.filter((door) => door.is_entrance);

    for (const door of entranceDoors) {
      const zoneTo = door.zone_to;
      const doorSide = door.entrance_door_side!;
      const floorId = door.floor.floor_id;

      const zoneCoords = coordinatesMap.get(zoneTo.zone_id);
      if (!zoneCoords) continue;

      this.validateEntranceDoorFits(door, doorSide, zoneCoords);
      this.validateEntranceDoorSpaceNotCovered(
        zoneTo,
        doorSide,
        floorId,
        allZones,
        allDoors,
        coordinatesMap,
      );
    }
  }

  private validateEntranceDoorSpaceNotCovered(
    zoneTo: Zone,
    doorSide: DoorSide,
    floorId: number,
    allZones: Zone[],
    allDoors: Door[],
    coordinatesMap: CoordinatesMap,
  ): void {
    const zoneCoords = coordinatesMap.get(zoneTo.zone_id)!;
    const doorSize = BUILDINGS_CONSTANTS.ZONE.DOOR_SIZE;

    const entranceDoorsOnSameSide = allDoors.filter(
      (d) =>
        d.is_entrance &&
        d.zone_to.zone_id === zoneTo.zone_id &&
        d.entrance_door_side === doorSide,
    );

    const totalSideLength =
      doorSide === DoorSide.TOP || doorSide === DoorSide.BOTTOM
        ? zoneCoords.width
        : zoneCoords.height;

    const otherZones = allZones.filter(
      (z) =>
        z.zone_id !== zoneTo.zone_id &&
        (!z.is_transition_between_floors
          ? z.floor?.floor_id === floorId
          : true),
    );

    let occupiedSpace = 0;

    for (const otherZone of otherZones) {
      const otherCoords = coordinatesMap.get(otherZone.zone_id);
      if (!otherCoords) continue;

      const isAdjacent = this.isZoneAdjacentToSide(
        zoneCoords,
        otherCoords,
        doorSide,
      );

      if (isAdjacent) {
        const intersectionLength = this.calculateIntersectionOnSide(
          zoneCoords,
          otherCoords,
          doorSide,
        );
        occupiedSpace += intersectionLength;
      }
    }

    const freeSpace = totalSideLength - occupiedSpace;
    const requiredSpace = entranceDoorsOnSameSide.length * doorSize;

    if (freeSpace < requiredSpace) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.ENTRANCE_DOOR_INSUFFICIENT_SPACE(
          freeSpace,
          doorSide,
          zoneTo.title,
          entranceDoorsOnSameSide.length,
          requiredSpace,
        ),
      );
    }
  }

  private isZoneAdjacentToSide(
    zoneCoords: Rectangle,
    otherCoords: Rectangle,
    doorSide: DoorSide,
  ): boolean {
    switch (doorSide) {
      case DoorSide.TOP:
        return otherCoords.y + otherCoords.height === zoneCoords.y;
      case DoorSide.BOTTOM:
        return otherCoords.y === zoneCoords.y + zoneCoords.height;
      case DoorSide.LEFT:
        return otherCoords.x + otherCoords.width === zoneCoords.x;
      case DoorSide.RIGHT:
        return otherCoords.x === zoneCoords.x + zoneCoords.width;
      default:
        return false;
    }
  }

  private calculateIntersectionOnSide(
    zoneCoords: Rectangle,
    otherCoords: Rectangle,
    doorSide: DoorSide,
  ): number {
    switch (doorSide) {
      case DoorSide.TOP:
      case DoorSide.BOTTOM: {
        const start = Math.max(zoneCoords.x, otherCoords.x);
        const end = Math.min(
          zoneCoords.x + zoneCoords.width,
          otherCoords.x + otherCoords.width,
        );
        return Math.max(0, end - start);
      }
      case DoorSide.LEFT:
      case DoorSide.RIGHT: {
        const start = Math.max(zoneCoords.y, otherCoords.y);
        const end = Math.min(
          zoneCoords.y + zoneCoords.height,
          otherCoords.y + otherCoords.height,
        );
        return Math.max(0, end - start);
      }
      default:
        return 0;
    }
  }

  private validateEntranceDoorFits(
    door: Door,
    doorSide: DoorSide,
    zoneCoords: Rectangle,
  ): void {
    const doorSize = BUILDINGS_CONSTANTS.ZONE.DOOR_SIZE;
    const fits =
      doorSide === DoorSide.TOP || doorSide === DoorSide.BOTTOM
        ? zoneCoords.width >= doorSize
        : zoneCoords.height >= doorSize;

    if (!fits) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.ENTRANCE_DOOR_NO_SPACE(
          door.door_id,
          doorSide,
        ),
      );
    }
  }

  private groupDoorsByZonePair(doors: Door[]): Map<string, Door[]> {
    const map = new Map<string, Door[]>();

    for (const door of doors) {
      if (door.is_entrance || !door.zone_from || !door.zone_to) continue;

      const pairKey = [door.zone_from.zone_id, door.zone_to.zone_id]
        .sort()
        .join('-');

      if (!map.has(pairKey)) {
        map.set(pairKey, []);
      }
      map.get(pairKey)!.push(door);
    }

    return map;
  }
}
