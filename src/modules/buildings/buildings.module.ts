import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Building } from './entities/building.entity';
import { Floor } from './entities/floor.entity';
import { Zone } from './entities/zone.entity';
import { Door } from './entities/door.entity';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { ZoneGeometryService } from './zone-geometry.service';
import { DoorManagementService } from './door-management.service';
import { ZoneGeometryValidator } from './zone-geometry.validator';
import { SharedModule } from '../../shared/shared.module';
import { multerConfig } from '../../shared/config/multer.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Building, Floor, Zone, Door]),
    MulterModule.register(multerConfig),
    SharedModule,
  ],
  controllers: [BuildingsController],
  providers: [
    BuildingsService,
    ZoneGeometryService,
    DoorManagementService,
    ZoneGeometryValidator,
  ],
  exports: [],
})
export class BuildingsModule {}
