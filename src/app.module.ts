import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { RfidModule } from './modules/rfid/rfid.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { GlobalAdminModule } from './modules/global-admin/global-admin.module';
import { TagAdminModule } from './modules/tag-admin/tag-admin.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
      inject: [ConfigService],
    }),

    SharedModule,
    AuthModule,
    OrganizationsModule,
    EmployeesModule,
    BuildingsModule,
    RfidModule,
    AccessControlModule,
    NotificationsModule,
    GlobalAdminModule,
    TagAdminModule,
  ],
})
export class AppModule {}
