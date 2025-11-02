import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagAdminController } from './tag-admin.controller';
import { TagAdminService } from './tag-admin.service';
import { TagAdmin } from './entities/tag-admin.entity';
import { TagAssignment } from './entities/tag-assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TagAdmin, TagAssignment])],
  controllers: [TagAdminController],
  providers: [TagAdminService],
  exports: [TagAdminService, TypeOrmModule],
})
export class TagAdminModule {}
