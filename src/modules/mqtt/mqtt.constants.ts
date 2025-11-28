export const MQTT_CONSTANTS = {
  TOPICS: {
    SCAN_PATTERN: 'inzone/readers/+/scan',
    SCAN_PREFIX: 'inzone',
    SCAN_READERS_SEGMENT: 'readers',
    SCAN_SUFFIX: 'scan',
  },
  TOPIC_PARTS: {
    PREFIX_INDEX: 0,
    READERS_SEGMENT_INDEX: 1,
    READER_ID_INDEX: 2,
    SUFFIX_INDEX: 3,
    EXPECTED_LENGTH: 4,
  },
  CLIENT: {
    ID: 'inzone_backend_service',
    RECONNECT_PERIOD: 5000,
    CONNECT_TIMEOUT: 30000,
    KEEPALIVE: 60,
  },
  AUTH_DECISION: {
    ALLOW: 'allow',
    DENY: 'deny',
    IGNORE: 'ignore',
  },
  ERROR_MESSAGES: {
    BROKER_URL_NOT_CONFIGURED: 'MQTT_BROKER_URL is not configured',
  },
} as const;
