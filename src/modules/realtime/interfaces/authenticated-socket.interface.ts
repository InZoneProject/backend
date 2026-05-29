import { Socket } from 'socket.io';
import { UserRole } from '../../auth/enums/user-role.enum';

export interface AuthenticatedSocket extends Socket {
  userId: number;
  role: UserRole;
  organizationIds?: number[];
  isSubscribed: boolean;
}
