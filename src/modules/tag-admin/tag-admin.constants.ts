export const TAG_ADMIN_CONSTANTS = {
  ERROR_MESSAGES: {
    TAG_ADMIN_NOT_FOUND: 'Tag admin not found',
    ORGANIZATION_NOT_FOUND: 'Organization not found',
    EMPLOYEE_NOT_FOUND: 'Employee not found',
    EMPLOYEE_NOT_IN_TAG_ADMIN_ORGANIZATION:
      'Employee does not belong to tag admin organization',
    EMPLOYEE_HAS_NO_POSITION: 'Employee must have at least one position',
    EMPLOYEE_ALREADY_HAS_TAG_IN_ORGANIZATION:
      'Employee already has an active RFID tag in this organization',
    EMPLOYEE_ALREADY_HAS_THIS_TAG:
      'This employee already has this RFID tag assigned',
    RFID_TAG_NOT_FOUND: 'RFID tag not found',
    TAG_ORGANIZATION_MISMATCH: 'RFID tag belongs to a different organization',
    TAG_ALREADY_ASSIGNED: 'RFID tag is already assigned to another employee',
    EMPLOYEE_HAS_NO_ACTIVE_TAG: 'Employee has no active RFID tag assignment',
  },
} as const;
