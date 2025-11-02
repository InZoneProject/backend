import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagAdmin } from './entities/tag-admin.entity';
import { TagAssignment } from './entities/tag-assignment.entity';

@Injectable()
export class TagAdminService {
  constructor(
    @InjectRepository(TagAdmin)
    private readonly tagAdminRepository: Repository<TagAdmin>,
    @InjectRepository(TagAssignment)
    private readonly tagAssignmentRepository: Repository<TagAssignment>,
  ) {}
}
