import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { MqttAuthService } from './mqtt-auth.service';
import { EmqxAuthDto } from './dto/auth-request.dto';
import { EmqxAclDto } from './dto/acl-request.dto';
import { MQTT_CONSTANTS } from './mqtt.constants';

@Controller('mqtt')
export class MqttController {
  constructor(private readonly mqttAuthService: MqttAuthService) {}

  @Post('auth')
  @HttpCode(HttpStatus.OK)
  async authenticate(@Body() dto: EmqxAuthDto): Promise<{ result: string }> {
    const isAllowed = await this.mqttAuthService.authenticate(
      dto.username,
      dto.password,
    );

    return {
      result: isAllowed
        ? MQTT_CONSTANTS.AUTH_DECISION.ALLOW
        : MQTT_CONSTANTS.AUTH_DECISION.DENY,
    };
  }

  @Post('acl')
  @HttpCode(HttpStatus.OK)
  authorize(@Body() dto: EmqxAclDto): { result: string } {
    const isAllowed = this.mqttAuthService.authorize(
      dto.username,
      dto.topic,
      dto.action,
    );

    return {
      result: isAllowed
        ? MQTT_CONSTANTS.AUTH_DECISION.ALLOW
        : MQTT_CONSTANTS.AUTH_DECISION.DENY,
    };
  }
}
