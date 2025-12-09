import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScanEventPayload } from './dto/scan-event-payload.dto';
import { ScanProcessingService } from './scan-processing.service';
import { LocationsGateway } from '../realtime/locations.gateway';
import { NotificationsGateway } from '../realtime/notifications.gateway';
import { Organization } from '../organizations/entities/organization.entity';
import { MQTT_CONSTANTS } from './mqtt.constants';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;
  private scanEventCallbacks: Array<
    (payload: ScanEventPayload, readerId: number) => Promise<void>
  > = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly scanProcessingService: ScanProcessingService,
    @Inject(forwardRef(() => LocationsGateway))
    private readonly locationsGateway: LocationsGateway,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  onModuleInit(): void {
    this.connect();
    this.registerScanEventHandler();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private registerScanEventHandler(): void {
    this.onScanEvent(async (payload, readerId) => {
      try {
        const result = await this.scanProcessingService.processScan(
          readerId,
          payload.tag_uid,
        );

        if (!result) return;

        const organization = await this.organizationRepository.findOne({
          where: { organization_id: result.organizationId },
          relations: ['organization_admin'],
        });

        if (!organization?.organization_admin) return;

        const adminId = organization.organization_admin.organization_admin_id;
        const buildingIdToEmit = result.buildingId ?? result.previousBuildingId;

        if (buildingIdToEmit) {
          this.locationsGateway.emitEmployeeLocationChange(
            buildingIdToEmit,
            result.employeeId,
            result.newZoneId,
          );
        }

        if (result.notification) {
          this.notificationsGateway.emitNotificationToAdmin(adminId, {
            notification_id: result.notification.notification_id,
            title: result.notification.title,
            message: result.notification.message,
            is_read: false,
            created_at: result.notification.created_at,
          });

          this.notificationsGateway.emitNotificationToEmployee(
            result.employeeId,
            {
              notification_id: result.notification.notification_id,
              title: result.notification.title,
              message: result.notification.message,
              is_read: false,
              created_at: result.notification.created_at,
            },
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`Error processing scan event: ${errorMessage}`);
      }
    });
  }

  private connect(): void {
    const brokerUrl = this.configService.get<string>('MQTT_BROKER_URL');

    if (!brokerUrl) {
      throw new Error(MQTT_CONSTANTS.ERROR_MESSAGES.BROKER_URL_NOT_CONFIGURED);
    }

    const username = this.configService.get<string>('MQTT_BACKEND_USERNAME');
    const password = this.configService.get<string>('MQTT_BACKEND_PASSWORD');

    this.client = mqtt.connect(brokerUrl, {
      username,
      password,
      clientId: `${MQTT_CONSTANTS.CLIENT.ID}_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      reconnectPeriod: MQTT_CONSTANTS.CLIENT.RECONNECT_PERIOD,
      connectTimeout: MQTT_CONSTANTS.CLIENT.CONNECT_TIMEOUT,
      keepalive: MQTT_CONSTANTS.CLIENT.KEEPALIVE,
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to MQTT Broker');
      this.subscribeToAllReaders();
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`MQTT Error: ${error.message}`);
    });

    this.client.on('message', (topic, message) => {
      void this.handleMessage(topic, message);
    });
  }

  private subscribeToAllReaders(): void {
    this.client.subscribe(MQTT_CONSTANTS.TOPICS.SCAN_PATTERN, (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to scan topic');
      }
    });
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const topicParts = topic.split('/');

      const {
        PREFIX_INDEX,
        READERS_SEGMENT_INDEX,
        READER_ID_INDEX,
        SUFFIX_INDEX,
        EXPECTED_LENGTH,
      } = MQTT_CONSTANTS.TOPIC_PARTS;

      const { SCAN_PREFIX, SCAN_READERS_SEGMENT, SCAN_SUFFIX } =
        MQTT_CONSTANTS.TOPICS;

      if (
        topicParts.length !== EXPECTED_LENGTH ||
        topicParts[PREFIX_INDEX] !== SCAN_PREFIX ||
        topicParts[READERS_SEGMENT_INDEX] !== SCAN_READERS_SEGMENT ||
        topicParts[SUFFIX_INDEX] !== SCAN_SUFFIX
      ) {
        return;
      }

      const readerId = parseInt(topicParts[READER_ID_INDEX], 10);

      if (isNaN(readerId)) return;

      const parsedData: unknown = JSON.parse(message.toString());

      if (
        typeof parsedData !== 'object' ||
        parsedData === null ||
        !('tag_uid' in parsedData)
      ) {
        return;
      }

      const payload = parsedData as ScanEventPayload;

      if (!payload.tag_uid) return;

      for (const callback of this.scanEventCallbacks) {
        await callback(payload, readerId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error handling MQTT message on topic ${topic}: ${errorMessage}`,
      );
    }
  }

  private onScanEvent(
    callback: (payload: ScanEventPayload, readerId: number) => Promise<void>,
  ): void {
    this.scanEventCallbacks.push(callback);
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.endAsync();
    }
  }
}
