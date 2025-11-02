import { Controller } from '@nestjs/common';
import { TagAdminService } from './tag-admin.service';

@Controller('tag-admin')
export class TagAdminController {
  constructor(private readonly tagAdminService: TagAdminService) {}
}
