export const ACCESS_CONTROL_CONSTANTS = {
  ERROR_MESSAGES: {
    ZONE_NOT_FOUND: 'Zone not found',
    ZONE_ACCESS_RULE_NOT_FOUND: 'Zone access rule not found',
    POSITION_NOT_FOUND: 'Position not found',
    MAX_DURATION_REQUIRED:
      'max_duration_minutes is required for TIME_LIMITED access type',
    INVALID_ACCESS_TYPE: 'Invalid access type',
    ZONE_ACCESS_RULE_ALREADY_EXISTS:
      'This zone access rule already exists for the zone',
    RULE_NOT_ATTACHED_TO_ZONE: 'Rule is not attached to any zone',
    CANNOT_ATTACH_WITHOUT_POSITIONS:
      'Cannot attach rule to zone without positions',
    CANNOT_REMOVE_LAST_POSITION:
      'Cannot remove last position. Detach rule from zone instead',
    POSITION_NOT_ATTACHED_TO_RULE: 'Position is not attached to this rule',
    POSITION_ALREADY_ATTACHED: 'Position is already attached to this rule',
    POSITIONS_NOT_IN_ORGANIZATION:
      'Some positions do not belong to the organization',
    CROSS_ORG_ATTACHMENT: 'Rule and Zone belong to different organizations',
  },
  VALIDATION: {
    MIN_DURATION: 1,
    MAX_DURATION: 1440,
  },
};
