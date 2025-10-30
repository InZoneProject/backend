import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from './entities/building.entity';
import { Floor } from './entities/floor.entity';
import { Zone } from './entities/zone.entity';
import { Door } from './entities/door.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Building, Floor, Zone, Door])],
  controllers: [],
  providers: [],
  exports: [],
})
export class BuildingsModule {}
