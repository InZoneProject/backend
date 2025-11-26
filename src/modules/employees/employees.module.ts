import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { Employee } from './entities/employee.entity';
import { InviteToken } from '../global-admin/entities/invite-token.entity';
import { Position } from '../organizations/entities/position.entity';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { SharedModule } from '../../shared/shared.module';
import { multerConfig } from '../../shared/config/multer.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, InviteToken, Position]),
    JwtModule.register({}),
    MulterModule.register(multerConfig),
    SharedModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
