import { ApiProperty } from '@nestjs/swagger';
import { EmployeeInfoDto } from './employee-info.dto';
import { EmployeeMovementItemDto } from './employee-movement-item.dto';
import { EmployeeViolationDto } from './employee-violation.dto';

export class EmployeeDailyMovementsResponseDto {
  @ApiProperty()
  employee: EmployeeInfoDto;

  @ApiProperty({ type: [EmployeeMovementItemDto] })
  movements: EmployeeMovementItemDto[];

  @ApiProperty({ type: [EmployeeViolationDto] })
  violations: EmployeeViolationDto[];
}
