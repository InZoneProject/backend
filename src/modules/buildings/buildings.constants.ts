export const BUILDINGS_CONSTANTS = {
  ZONE: {
    MIN_WIDTH: 2,
    MIN_HEIGHT: 2,
    MIN_INTERSECTION: 2,
    DOOR_SIZE: 2,
  },
  LOG_MESSAGES: {
    FAILED_TO_DELETE_PHOTO: 'Failed to delete photo file:',
  },
  ERROR_MESSAGES: {
    BUILDING_NOT_FOUND: 'Building not found',
    FLOOR_NOT_FOUND: 'Floor not found in this building',
    ZONE_NOT_FOUND: 'Zone not found',
    NO_INTERSECTION: 'Zone does not touch adjacent zone',
    INSUFFICIENT_INTERSECTION:
      'Zone must intersect with adjacent zone by at least 2 units',
    ZONE_OVERLAP: 'Zone overlaps with existing zone',
    NO_SPACE_FOR_ENTRANCE_DOORS: (
      doorsCount: number,
      side: string,
      zoneTitle: string,
    ) =>
      `Not enough space for ${doorsCount} entrance door(s) on ${side} side of zone "${zoneTitle}"`,
    NO_SPACE_FOR_REGULAR_DOORS:
      'Not enough space to add another door between these zones',
    FLOOR_ID_REQUIRED_FOR_NON_TRANSITION:
      'floor_id is required for non-transition zones',
    ZONES_DO_NOT_INTERSECT: 'Zones do not intersect',
    ZONES_ON_DIFFERENT_FLOORS: 'Zones are on different floors',
    ZONES_IN_DIFFERENT_BUILDINGS: 'Zones must be in the same building',
    ZONE_FROM_REQUIRED_FOR_REGULAR_DOOR:
      'zone_from is required for regular doors',
    CANNOT_DISCONNECT_ZONES: (zoneTitle: string, doorId: number) =>
      `Cannot reduce zone size: would disconnect from zone "${zoneTitle}" (door_id: ${doorId})`,
    ENTRANCE_DOOR_NO_SPACE: (doorId: number, side: string) =>
      `Cannot reduce zone: entrance door (door_id: ${doorId}) on ${side} side would not fit`,
    AT_LEAST_ONE_PARAMETER_REQUIRED:
      'At least one parameter (width, height, x_coordinate, y_coordinate) must be provided',
    ENTRANCE_DOOR_FLOOR_MISMATCH:
      'Non-transition zones can only have entrance doors on the floor they belong to',
    FLOOR_NUMBER_TOO_HIGH_FOR_CREATE: (maxFloorNumber: number) =>
      `Floor number cannot be greater than ${maxFloorNumber + 1}`,
    FLOOR_NUMBER_TOO_HIGH_FOR_REORDER: (maxFloorNumber: number) =>
      `Floor number cannot be greater than ${maxFloorNumber}`,
    CANNOT_DELETE_LAST_FLOOR: 'Cannot delete the last remaining floor',
    FLOOR_ALREADY_AT_POSITION: 'Floor is already at this position',
    CANNOT_DELETE_LAST_ENTRANCE_DOOR:
      'Cannot delete the last entrance door in the building',
    CANNOT_DELETE_LAST_DOOR_BETWEEN_ZONES:
      'Cannot delete the last door between these zones',
    DOOR_NOT_FOUND: 'Door not found',
    CANNOT_DELETE_FLOOR_WITH_LAST_ENTRANCE_DOOR:
      'Cannot delete floor: it contains the last entrance door in the building',
    CANNOT_DELETE_FLOOR_WOULD_DISCONNECT_TRANSITION_ZONE: (zoneTitle: string) =>
      `Cannot delete floor: transition zone "${zoneTitle}" would lose all connections to other zones`,
    CANNOT_DELETE_ZONE_WITH_LAST_ENTRANCE_DOOR:
      'Cannot delete zone: it contains the last entrance door in the building',
    CANNOT_DELETE_ZONE_WOULD_DISCONNECT_ZONES: (
      zone1Title: string,
      zone2Title: string,
    ) =>
      `Cannot delete zone: zones "${zone1Title}" and "${zone2Title}" would lose all connections`,
    COORDINATE_SIZE_MISMATCH_X: (
      deltaX: number,
      requiredWidthChange: number,
      deltaWidth: number,
    ) =>
      `When changing x by ${deltaX}, width must change by at least ${requiredWidthChange}. Current width change: ${deltaWidth}`,
    COORDINATE_SIZE_MISMATCH_Y: (
      deltaY: number,
      requiredHeightChange: number,
      deltaHeight: number,
    ) =>
      `When changing y by ${deltaY}, height must change by at least ${requiredHeightChange}. Current height change: ${deltaHeight}`,
    ZONE_OVERLAP_WITH_ZONE: (zoneTitle: string) =>
      `Cannot update zone: would overlap with zone "${zoneTitle}"`,
    INSUFFICIENT_SPACE_FOR_DOORS: (
      doorsLength: number,
      zoneFromTitle: string,
      zoneToTitle: string,
      requiredIntersection: number,
      intersectionLength: number,
    ) =>
      `Cannot reduce zone: ${doorsLength} door(s) between "${zoneFromTitle}" and "${zoneToTitle}" require ${requiredIntersection} units of intersection, but only ${intersectionLength} available`,
    ENTRANCE_DOOR_INSUFFICIENT_SPACE: (
      freeSpace: number,
      doorSide: string,
      zoneTitle: string,
      doorsCount: number,
      requiredSpace: number,
    ) =>
      `Insufficient space for entrance doors: ${freeSpace} units available on ${doorSide} side of "${zoneTitle}", but ${doorsCount} door(s) require ${requiredSpace} units`,
    DOOR_ALREADY_HAS_READER: 'Door already has an RFID reader assigned',
    RFID_READER_NOT_FOUND: 'RFID reader not found',
    READER_ORGANIZATION_MISMATCH:
      'RFID reader belongs to a different organization',
    READER_ALREADY_ASSIGNED: 'RFID reader is already assigned to another door',
    DOOR_HAS_NO_READER: 'Door does not have an RFID reader assigned',
  },
} as const;
