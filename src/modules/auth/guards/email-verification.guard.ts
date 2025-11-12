import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AUTH_CONSTANTS } from '../auth.constants';
import { UserRole } from '../enums/user-role.enum';
import { RequestWithUser } from '../types/request-with-user.types';

@Injectable()
export class EmailVerificationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: RequestWithUser = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.role === UserRole.GLOBAL_ADMIN) {
      return true;
    }

    if (!user.is_email_verified) {
      throw new ForbiddenException(
        AUTH_CONSTANTS.ERROR_MESSAGES.EMAIL_NOT_VERIFIED,
      );
    }

    return true;
  }
}
