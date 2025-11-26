import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Organization } from './entities/organization.entity';
import { OrganizationAdmin } from './entities/organization-admin.entity';
import { Position } from './entities/position.entity';
import { InviteToken } from '../global-admin/entities/invite-token.entity';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { multerConfig } from '../../shared/config/multer.config';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationAdmin,
      Position,
      InviteToken,
    ]),
    MulterModule.register(multerConfig),
    SharedModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
