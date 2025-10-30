import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalAdmin } from '../../shared/entities/global-admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalAdmin])],
  controllers: [],
  providers: [],
  exports: [],
})
export class AuthModule {}
