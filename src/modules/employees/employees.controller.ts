import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiBody } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JoinOrganizationDto } from './dto/join-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { RequestWithUser } from '../auth/types/request-with-user.types';

@ApiTags('Employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post('join')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: JoinOrganizationDto })
  async joinOrganization(
    @Body() joinDto: JoinOrganizationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employeesService.joinOrganization(req.user.sub, joinDto);
  }
}
