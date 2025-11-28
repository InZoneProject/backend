import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsGateway } from './locations.gateway';
import { NotificationsGateway } from './notifications.gateway';
import { Building } from '../buildings/entities/building.entity';
import { Organization } from '../organizations/entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Building, Organization]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [LocationsGateway, NotificationsGateway],
  exports: [LocationsGateway, NotificationsGateway],
})
export class RealtimeModule {}
