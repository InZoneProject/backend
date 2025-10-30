import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZoneAccessRule } from './entities/zone-access-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ZoneAccessRule])],
  controllers: [],
  providers: [],
  exports: [],
})
export class AccessControlModule {}
