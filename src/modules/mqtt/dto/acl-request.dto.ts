import { IsString, IsEnum } from 'class-validator';
import { MqttAction } from '../../../shared/enums/mqtt-action.enum';

export class EmqxAclDto {
  @IsString()
  username: string;

  @IsString()
  topic: string;

  @IsString()
  @IsEnum(MqttAction)
  action: MqttAction;

  @IsString()
  clientid: string;
}
