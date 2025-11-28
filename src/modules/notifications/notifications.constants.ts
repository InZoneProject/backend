export const NOTIFICATION_CONSTANTS = {
  TITLES: {
    TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
    UNAUTHORIZED_ZONE_ACCESS: 'Unauthorized Zone Access',
  },
  MESSAGE_TEMPLATES: {
    TIME_LIMIT_EXCEEDED: (
      employeeName: string,
      positions: string,
      zoneName: string,
    ) =>
      `Employee ${employeeName} (${positions}) exceeded time limit in zone "${zoneName}".`,
    UNAUTHORIZED_ZONE_ACCESS: (
      employeeName: string,
      positions: string,
      zoneName: string,
    ) =>
      `Employee ${employeeName} (${positions}) entered forbidden zone "${zoneName}".`,
  },
  WEBSOCKET_EVENTS: {
    NOTIFICATION_RECEIVED: 'notification.received',
  },
} as const;
