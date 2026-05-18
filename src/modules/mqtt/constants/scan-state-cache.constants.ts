export const SCAN_STATE_CACHE_CONSTANTS = {
  KEYS: {
    CURRENT_ZONE: (employeeId: number) =>
      `scan-state:employee:${employeeId}:current-zone`,
    RECENT_SCAN: (scanEventId: number) => `scan-events:recent:${scanEventId}`,
  },
};
