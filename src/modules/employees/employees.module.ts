import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Employee } from './entities/employee.entity';
import { InviteToken } from '../global-admin/entities/invite-token.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, InviteToken, Organization]),
    JwtModule.register({}),
    SharedModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
