export const ORGANIZATIONS_CONSTANTS = {
  VALIDATION_PATTERNS: {
    TIME: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
  },
  VALIDATION_MESSAGES: {
    TIME_FORMAT: 'Час має бути у форматі HH:MM:SS (наприклад, 09:00:00)',
  },
  DEFAULT_STRUCTURE: {
    BUILDING_TITLE: 'Головна будівля',
    FLOOR_NUMBER: 1,
    ZONE_TITLE: 'Вхідна зона',
    ZONE_PHOTO: '',
    ZONE_X_COORDINATE: 0,
    ZONE_Y_COORDINATE: 0,
  },
  WORK_HOURS: {
    MIN_DURATION_HOURS: 4,
  },
  ERROR_MESSAGES: {
    ORGANIZATION_ADMIN_NOT_FOUND: 'Organization admin not found',
    ORGANIZATION_NOT_FOUND: 'Organization not found',
    INVALID_WORK_HOURS:
      'Work day end time must be at least 4 hours after start time',
    ACCESS_DENIED: 'Access denied to this organization',
  },
} as const;
