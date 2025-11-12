import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: number;
  role: UserRole;
  is_email_verified?: boolean;
}
