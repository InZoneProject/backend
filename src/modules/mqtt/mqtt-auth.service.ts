import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TokenHashService } from '../../shared/services/token-hash.service';
import { RfidReader } from '../rfid/entities/rfid-reader.entity';
import { MQTT_CONSTANTS } from './mqtt.constants';
import { MqttAction } from '../../shared/enums/mqtt-action.enum';

@Injectable()
export class MqttAuthService {
  constructor(
    @InjectRepository(RfidReader)
    private readonly rfidReaderRepository: Repository<RfidReader>,
    private readonly configService: ConfigService,
    private readonly tokenHashService: TokenHashService,
  ) {}

  async authenticate(username: string, password?: string): Promise<boolean> {
    const systemUser = this.configService.get<string>('MQTT_BACKEND_USERNAME');
    const systemPass = this.configService.get<string>('MQTT_BACKEND_PASSWORD');

    if (username === systemUser) {
      return password === systemPass;
    }

    return this.validateReader(username, password);
  }

  authorize(username: string, topic: string, action: MqttAction): boolean {
    const systemUser = this.configService.get<string>('MQTT_BACKEND_USERNAME');

    if (username === systemUser) {
      return true;
    }

    return this.checkReaderAcl(username, topic, action);
  }

  private async validateReader(
    username: string,
    password?: string,
  ): Promise<boolean> {
    const readerId = parseInt(username, 10);

    if (isNaN(readerId) || !password) {
      return false;
    }

    const reader = await this.rfidReaderRepository.findOne({
      where: { rfid_reader_id: readerId },
    });

    if (!reader || !reader.secret_token) {
      return false;
    }

    return this.tokenHashService.compareToken(password, reader.secret_token);
  }

  private checkReaderAcl(
    username: string,
    topic: string,
    action: MqttAction,
  ): boolean {
    if (action !== MqttAction.PUBLISH) {
      return false;
    }

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

    if (topicParts.length !== EXPECTED_LENGTH) {
      return false;
    }

    if (topicParts[PREFIX_INDEX] !== SCAN_PREFIX) {
      return false;
    }

    if (topicParts[READERS_SEGMENT_INDEX] !== SCAN_READERS_SEGMENT) {
      return false;
    }

    if (topicParts[SUFFIX_INDEX] !== SCAN_SUFFIX) {
      return false;
    }

    const topicReaderId = topicParts[READER_ID_INDEX];
    return topicReaderId === username;
  }
}
