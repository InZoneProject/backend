import { Socket } from 'socket.io';
import { UnauthorizedException } from '@nestjs/common';
import { REALTIME_CONSTANTS } from '../../modules/realtime/realtime.constants';

export function extractTokenFromHandshake(client: Socket): string {
  const authData = client.handshake.auth;
  const headerToken = client.handshake.headers?.authorization;
  let token: string | undefined;

  if (
    authData &&
    typeof authData === 'object' &&
    'token' in authData &&
    typeof authData.token === 'string'
  ) {
    token = authData.token;
  } else if (typeof headerToken === 'string') {
    token = headerToken;
  }

  if (!token) {
    throw new UnauthorizedException(REALTIME_CONSTANTS.MESSAGES.NO_TOKEN);
  }

  return token.replace('Bearer ', '');
}
