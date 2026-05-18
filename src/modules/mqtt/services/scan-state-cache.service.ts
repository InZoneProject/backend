import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { SCAN_STATE_CACHE_CONSTANTS } from '../constants/scan-state-cache.constants';
import { RecentScanCacheEntry } from '../interfaces/recent-scan-cache-entry.interface';

@Injectable()
export class ScanStateCacheService {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async getCurrentZoneId(
    employeeId: number,
  ): Promise<number | null | undefined> {
    const cachedZoneId = await this.redisService.getString(
      SCAN_STATE_CACHE_CONSTANTS.KEYS.CURRENT_ZONE(employeeId),
    );

    if (cachedZoneId === null) return undefined;
    if (cachedZoneId === 'null') return null;

    const parsedZoneId = Number(cachedZoneId);
    return Number.isFinite(parsedZoneId) ? parsedZoneId : undefined;
  }

  async setCurrentZoneId(
    employeeId: number,
    zoneId: number | null,
  ): Promise<void> {
    await this.redisService.setString(
      SCAN_STATE_CACHE_CONSTANTS.KEYS.CURRENT_ZONE(employeeId),
      zoneId === null ? 'null' : String(zoneId),
      this.getPositiveNumberConfig('SCAN_CURRENT_ZONE_TTL_SECONDS'),
    );
  }

  async setRecentScan(scan: RecentScanCacheEntry): Promise<void> {
    await this.redisService.set(
      SCAN_STATE_CACHE_CONSTANTS.KEYS.RECENT_SCAN(scan.scan_event_id),
      scan,
      this.getPositiveNumberConfig('SCAN_RECENT_SCAN_TTL_SECONDS'),
    );
  }

  private getPositiveNumberConfig(key: string): number {
    const value = Number(this.configService.getOrThrow<string>(key));
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${key} must be a positive number`);
    }

    return value;
  }
}
