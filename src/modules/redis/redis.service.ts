import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CONSTANTS } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;
  private isAvailable = false;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisPort = this.configService.get<number>('REDIS_PORT');
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const redisKeyPrefix = this.configService.get<string>('REDIS_KEY_PREFIX');

    if (
      !redisKeyPrefix ||
      (!redisUrl && (!redisHost || !redisPort || !redisPassword))
    ) {
      throw new Error(REDIS_CONSTANTS.MISSING_CONFIGURATION);
    }

    this.client = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          connectTimeout: REDIS_CONSTANTS.CONNECT_TIMEOUT_MS,
        })
      : new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          connectTimeout: REDIS_CONSTANTS.CONNECT_TIMEOUT_MS,
        });

    this.client.on('ready', () => {
      this.isAvailable = true;
    });

    this.client.on('end', () => {
      this.isAvailable = false;
    });

    this.client.on('error', (error) => {
      this.isAvailable = false;
      this.logger.warn(`Redis unavailable: ${error.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.read(key);
    if (value === null) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.write(key, JSON.stringify(value), ttlSeconds);
  }

  async getString(key: string): Promise<string | null> {
    return this.read(key);
  }

  async getStrings(keys: string[]): Promise<Map<string, string | null>> {
    if (keys.length === 0) return new Map();

    const client = await this.getClient();
    if (!client) return new Map(keys.map((key) => [key, null]));

    const values = await client.mget(keys.map((key) => this.normalizeKey(key)));
    return new Map(keys.map((key, index) => [key, values[index]]));
  }

  async setString(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.write(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    await client.del(this.normalizeKey(key));
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    await this.client.quit();
  }

  private async read(key: string): Promise<string | null> {
    const client = await this.getClient();
    if (!client) return null;
    return client.get(this.normalizeKey(key));
  }

  private async write(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    await client.set(this.normalizeKey(key), value, 'EX', ttlSeconds);
  }

  private async getClient(): Promise<Redis | null> {
    if (!this.client) return null;
    if (this.isAvailable) return this.client;

    try {
      await this.client.connect();
      this.isAvailable = true;
      return this.client;
    } catch {
      this.isAvailable = false;
      return null;
    }
  }

  private normalizeKey(key: string): string {
    const prefix = this.configService.getOrThrow<string>('REDIS_KEY_PREFIX');

    return `${prefix}:${key}`;
  }
}
