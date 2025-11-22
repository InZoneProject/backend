import { Injectable, BadRequestException } from '@nestjs/common';
import { Zone } from './entities/zone.entity';
import { BUILDINGS_CONSTANTS } from './buildings.constants';
import { DoorSide } from './enums/door-side.enum';

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface IntersectionResult {
  hasIntersection: boolean;
  intersectionLength: number;
  side: DoorSide | null;
}

@Injectable()
export class ZoneGeometryValidator {
  private isHorizontalSide(side: DoorSide): boolean {
    return side === DoorSide.BOTTOM || side === DoorSide.TOP;
  }

  private getSideCoordinates(
    rect: Rectangle,
    side: DoorSide,
  ): { start: number; end: number } {
    if (this.isHorizontalSide(side)) {
      return { start: rect.x, end: rect.x + rect.width };
    }
    return { start: rect.y, end: rect.y + rect.height };
  }

  private calculateSegmentIntersection(
    rect1: Rectangle,
    rect2: Rectangle,
    side: DoorSide,
  ): { start: number; end: number } {
    if (this.isHorizontalSide(side)) {
      return {
        start: Math.max(rect1.x, rect2.x),
        end: Math.min(rect1.x + rect1.width, rect2.x + rect2.width),
      };
    }
    return {
      start: Math.max(rect1.y, rect2.y),
      end: Math.min(rect1.y + rect1.height, rect2.y + rect2.height),
    };
  }

  private mergeSegments(
    segments: Array<{ start: number; end: number }>,
  ): Array<{ start: number; end: number }> {
    segments.sort((a, b) => a.start - b.start);

    const merged: Array<{ start: number; end: number }> = [];
    for (const segment of segments) {
      if (merged.length === 0) {
        merged.push(segment);
      } else {
        const last = merged[merged.length - 1];
        if (segment.start <= last.end) {
          last.end = Math.max(last.end, segment.end);
        } else {
          merged.push(segment);
        }
      }
    }
    return merged;
  }

  private calculateFreeSegments(
    totalStart: number,
    totalEnd: number,
    occupiedSegments: Array<{ start: number; end: number }>,
  ): Array<{ start: number; end: number }> {
    const free: Array<{ start: number; end: number }> = [];
    let currentPos = totalStart;

    for (const occupied of occupiedSegments) {
      if (currentPos < occupied.start) {
        free.push({ start: currentPos, end: occupied.start });
      }
      currentPos = Math.max(currentPos, occupied.end);
    }

    if (currentPos < totalEnd) {
      free.push({ start: currentPos, end: totalEnd });
    }

    return free;
  }

  private canPlaceDoors(
    freeSegments: Array<{ start: number; end: number }>,
    doorsCount: number,
  ): boolean {
    let remaining = doorsCount;

    for (const segment of freeSegments) {
      const segmentLength = segment.end - segment.start;
      const doorsCanFit = Math.floor(
        segmentLength / BUILDINGS_CONSTANTS.ZONE.DOOR_SIZE,
      );

      if (doorsCanFit >= remaining) {
        return true;
      }

      remaining -= doorsCanFit;
    }

    return false;
  }

  calculateIntersection(
    zone1: Rectangle,
    zone2: Rectangle,
  ): IntersectionResult {
    if (zone1.x + zone1.width === zone2.x) {
      const intersectionStart = Math.max(zone1.y, zone2.y);
      const intersectionEnd = Math.min(
        zone1.y + zone1.height,
        zone2.y + zone2.height,
      );
      const length = intersectionEnd - intersectionStart;

      if (length > 0) {
        return {
          hasIntersection: true,
          intersectionLength: length,
          side: DoorSide.RIGHT,
        };
      }
    }

    if (zone1.x === zone2.x + zone2.width) {
      const intersectionStart = Math.max(zone1.y, zone2.y);
      const intersectionEnd = Math.min(
        zone1.y + zone1.height,
        zone2.y + zone2.height,
      );
      const length = intersectionEnd - intersectionStart;

      if (length > 0) {
        return {
          hasIntersection: true,
          intersectionLength: length,
          side: DoorSide.LEFT,
        };
      }
    }

    if (zone1.y + zone1.height === zone2.y) {
      const intersectionStart = Math.max(zone1.x, zone2.x);
      const intersectionEnd = Math.min(
        zone1.x + zone1.width,
        zone2.x + zone2.width,
      );
      const length = intersectionEnd - intersectionStart;

      if (length > 0) {
        return {
          hasIntersection: true,
          intersectionLength: length,
          side: DoorSide.BOTTOM,
        };
      }
    }

    if (zone1.y === zone2.y + zone2.height) {
      const intersectionStart = Math.max(zone1.x, zone2.x);
      const intersectionEnd = Math.min(
        zone1.x + zone1.width,
        zone2.x + zone2.width,
      );
      const length = intersectionEnd - intersectionStart;

      if (length > 0) {
        return {
          hasIntersection: true,
          intersectionLength: length,
          side: DoorSide.TOP,
        };
      }
    }

    return {
      hasIntersection: false,
      intersectionLength: 0,
      side: null,
    };
  }

  checkOverlap(zone1: Rectangle, zone2: Rectangle): boolean {
    if (zone1.x + zone1.width <= zone2.x || zone2.x + zone2.width <= zone1.x) {
      return false;
    }

    if (
      zone1.y + zone1.height <= zone2.y ||
      zone2.y + zone2.height <= zone1.y
    ) {
      return false;
    }

    return true;
  }

  validateHasIntersectionWithAtLeastOneZone(
    newZone: Rectangle,
    existingZones: Zone[],
  ): void {
    let hasValidIntersection = false;

    for (const zone of existingZones) {
      const zoneRect = {
        x: zone.x_coordinate,
        y: zone.y_coordinate,
        width: zone.width,
        height: zone.height,
      };

      const intersection = this.calculateIntersection(newZone, zoneRect);

      if (
        intersection.hasIntersection &&
        intersection.intersectionLength >=
          BUILDINGS_CONSTANTS.ZONE.MIN_INTERSECTION
      ) {
        hasValidIntersection = true;
        break;
      }
    }

    if (!hasValidIntersection) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.NO_INTERSECTION,
      );
    }
  }

  validateNoOverlap(newZone: Rectangle, existingZones: Zone[]): void {
    for (const existingZone of existingZones) {
      const overlaps = this.checkOverlap(newZone, {
        x: existingZone.x_coordinate,
        y: existingZone.y_coordinate,
        width: existingZone.width,
        height: existingZone.height,
      });

      if (overlaps) {
        throw new BadRequestException(
          BUILDINGS_CONSTANTS.ERROR_MESSAGES.ZONE_OVERLAP,
        );
      }
    }
  }

  validateEntranceDoorSpaceForNewDoor(
    zone: Zone,
    entranceDoorSide: DoorSide,
    allExistingZones: Zone[],
    existingEntranceDoors: Array<{ entrance_door_side: DoorSide | null }>,
  ): void {
    const zoneRect = {
      x: zone.x_coordinate,
      y: zone.y_coordinate,
      width: zone.width,
      height: zone.height,
    };

    const { start: totalStart, end: totalEnd } = this.getSideCoordinates(
      zoneRect,
      entranceDoorSide,
    );

    const occupiedSegments: Array<{ start: number; end: number }> = [];

    for (const otherZone of allExistingZones) {
      if (otherZone.zone_id === zone.zone_id) continue;

      const otherRect = {
        x: otherZone.x_coordinate,
        y: otherZone.y_coordinate,
        width: otherZone.width,
        height: otherZone.height,
      };

      const intersection = this.calculateIntersection(zoneRect, otherRect);

      if (
        intersection.hasIntersection &&
        intersection.side === entranceDoorSide
      ) {
        const segment = this.calculateSegmentIntersection(
          zoneRect,
          otherRect,
          entranceDoorSide,
        );
        occupiedSegments.push(segment);
      }
    }

    const doorsOnSameSide = existingEntranceDoors.filter(
      (door) => door.entrance_door_side === entranceDoorSide,
    );

    const mergedSegments = this.mergeSegments(occupiedSegments);
    const freeSegments = this.calculateFreeSegments(
      totalStart,
      totalEnd,
      mergedSegments,
    );

    const doorsToPlace = doorsOnSameSide.length + 1;
    const canPlace = this.canPlaceDoors(freeSegments, doorsToPlace);

    if (!canPlace) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.NO_SPACE_FOR_ENTRANCE_DOORS(
          doorsToPlace,
          entranceDoorSide,
          zone.title,
        ),
      );
    }
  }

  validateEntranceDoorSpace(
    existingZone: Zone,
    newZone: Rectangle,
    entranceDoorSide: DoorSide,
    allExistingZones: Zone[],
    existingEntranceDoors: Array<{ entrance_door_side: DoorSide | null }>,
  ): void {
    const existingRect = {
      x: existingZone.x_coordinate,
      y: existingZone.y_coordinate,
      width: existingZone.width,
      height: existingZone.height,
    };

    const { start: totalStart, end: totalEnd } = this.getSideCoordinates(
      existingRect,
      entranceDoorSide,
    );

    const occupiedSegments: Array<{ start: number; end: number }> = [];

    for (const otherZone of allExistingZones) {
      if (otherZone.zone_id === existingZone.zone_id) continue;

      const otherRect = {
        x: otherZone.x_coordinate,
        y: otherZone.y_coordinate,
        width: otherZone.width,
        height: otherZone.height,
      };

      const intersection = this.calculateIntersection(existingRect, otherRect);

      if (
        intersection.hasIntersection &&
        intersection.side === entranceDoorSide
      ) {
        const segment = this.calculateSegmentIntersection(
          existingRect,
          otherRect,
          entranceDoorSide,
        );
        occupiedSegments.push(segment);
      }
    }

    const newIntersection = this.calculateIntersection(existingRect, newZone);
    if (
      newIntersection.hasIntersection &&
      newIntersection.side === entranceDoorSide
    ) {
      const segment = this.calculateSegmentIntersection(
        existingRect,
        newZone,
        entranceDoorSide,
      );
      occupiedSegments.push(segment);
    }

    const doorsOnSameSide = existingEntranceDoors.filter(
      (door) => door.entrance_door_side === entranceDoorSide,
    );

    const mergedSegments = this.mergeSegments(occupiedSegments);
    const freeSegments = this.calculateFreeSegments(
      totalStart,
      totalEnd,
      mergedSegments,
    );

    const canPlace = this.canPlaceDoors(freeSegments, doorsOnSameSide.length);

    if (!canPlace) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.NO_SPACE_FOR_ENTRANCE_DOORS(
          doorsOnSameSide.length,
          entranceDoorSide,
          existingZone.title,
        ),
      );
    }
  }

  validateRegularDoorSpace(
    zone1: Zone,
    zone2: Zone,
    existingDoorsBetweenZones: number,
  ): void {
    const rect1 = {
      x: zone1.x_coordinate,
      y: zone1.y_coordinate,
      width: zone1.width,
      height: zone1.height,
    };

    const rect2 = {
      x: zone2.x_coordinate,
      y: zone2.y_coordinate,
      width: zone2.width,
      height: zone2.height,
    };

    const intersection = this.calculateIntersection(rect1, rect2);

    if (!intersection.hasIntersection) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.ZONES_DO_NOT_INTERSECT,
      );
    }

    if (
      intersection.intersectionLength <
      BUILDINGS_CONSTANTS.ZONE.MIN_INTERSECTION
    ) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.INSUFFICIENT_INTERSECTION,
      );
    }

    const doorSide = intersection.side!;

    const intersectionSegment = this.calculateSegmentIntersection(
      rect1,
      rect2,
      doorSide,
    );

    const totalAvailableSpace =
      intersectionSegment.end - intersectionSegment.start;
    const doorsToPlace = existingDoorsBetweenZones + 1;
    const spaceNeeded = doorsToPlace * BUILDINGS_CONSTANTS.ZONE.DOOR_SIZE;

    const canPlace = totalAvailableSpace >= spaceNeeded;

    if (!canPlace) {
      throw new BadRequestException(
        BUILDINGS_CONSTANTS.ERROR_MESSAGES.NO_SPACE_FOR_REGULAR_DOORS,
      );
    }
  }
}
