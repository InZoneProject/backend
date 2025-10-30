import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationAdmin } from './entities/organization-admin.entity';
import { Position } from './entities/position.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationAdmin, Position]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class OrganizationsModule {}
