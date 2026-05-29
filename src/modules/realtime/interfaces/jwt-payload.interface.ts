import { UserRole } from '../../auth/enums/user-role.enum';

export interface JwtPayload {
  sub: number;
  role: UserRole;
  organizationIds?: number[];
}
