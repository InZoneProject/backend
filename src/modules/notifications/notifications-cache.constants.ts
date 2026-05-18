export const NOTIFICATIONS_CACHE_CONSTANTS = {
  KEYS: {
    LAST_TIME_LIMIT: (employeeId: number, zoneId: number, dayKey: string) =>
      `notifications:last-time-limit:${employeeId}:${zoneId}:${dayKey}`,
  },
};
