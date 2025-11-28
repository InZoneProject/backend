import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../auth/enums/user-role.enum';
import { REALTIME_CONSTANTS } from './realtime.constants';
import { extractTokenFromHandshake } from '../../shared/utils/socket-token.util';

interface AuthenticatedSocket extends Socket {
  userId: number;
  role: UserRole;
  organizationIds?: number[];
  isSubscribed: boolean;
}

interface JwtPayload {
  sub: number;
  role: UserRole;
  organizationIds?: number[];
}

interface NotificationPayload {
  notification_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.SOCKETIO_CORS_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: AuthenticatedSocket): void {
    try {
      const token = extractTokenFromHandshake(client);
      const payload = this.verifyToken(token);

      client.userId = payload.sub;
      client.role = payload.role;
      client.isSubscribed = false;

      if (
        payload.role !== UserRole.ORGANIZATION_ADMIN &&
        payload.role !== UserRole.EMPLOYEE
      ) {
        client.disconnect();
        return;
      }

      if (payload.role === UserRole.ORGANIZATION_ADMIN) {
        client.organizationIds = payload.organizationIds ?? [];
      }
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage(REALTIME_CONSTANTS.EVENTS.SUBSCRIBE)
  async handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (client.isSubscribed) {
      this.sendError(client, REALTIME_CONSTANTS.MESSAGES.ALREADY_SUBSCRIBED);
      return;
    }

    const roomName = this.getRoomName(client);
    if (!roomName) return;

    await client.join(roomName);
    client.isSubscribed = true;

    this.sendSuccess(
      client,
      REALTIME_CONSTANTS.MESSAGES.SUBSCRIBED_NOTIFICATIONS,
    );
  }

  @SubscribeMessage(REALTIME_CONSTANTS.EVENTS.UNSUBSCRIBE)
  async handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.isSubscribed) {
      this.sendError(client, REALTIME_CONSTANTS.MESSAGES.NOT_SUBSCRIBED);
      return;
    }

    const roomName = this.getRoomName(client);
    if (!roomName) return;

    await client.leave(roomName);
    client.isSubscribed = false;

    this.sendSuccess(
      client,
      REALTIME_CONSTANTS.MESSAGES.UNSUBSCRIBED_NOTIFICATIONS,
    );
  }

  emitNotificationToEmployee(
    employeeId: number,
    notification: NotificationPayload,
  ): void {
    const roomName = `employee-${employeeId}`;
    this.server
      .to(roomName)
      .emit(REALTIME_CONSTANTS.EVENTS.NOTIFICATION_RECEIVED, notification);
  }

  emitNotificationToAdmin(
    organizationAdminId: number,
    notification: NotificationPayload,
  ): void {
    const roomName = `org-admin-${organizationAdminId}`;
    this.server
      .to(roomName)
      .emit(REALTIME_CONSTANTS.EVENTS.NOTIFICATION_RECEIVED, notification);
  }

  private getRoomName(client: AuthenticatedSocket): string | null {
    if (client.role === UserRole.ORGANIZATION_ADMIN) {
      return `org-admin-${client.userId}`;
    } else if (client.role === UserRole.EMPLOYEE) {
      return `employee-${client.userId}`;
    } else {
      this.sendError(client, REALTIME_CONSTANTS.MESSAGES.INVALID_ROLE);
      return null;
    }
  }

  private sendError(client: Socket, message: string): void {
    client.emit(REALTIME_CONSTANTS.EVENTS.ERROR, { message });
  }

  private sendSuccess(client: Socket, message: string): void {
    client.emit(REALTIME_CONSTANTS.EVENTS.SUCCESS, { message });
  }

  private verifyToken(token: string): JwtPayload {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException(
        REALTIME_CONSTANTS.MESSAGES.JWT_SECRET_MISSING,
      );
    }
    return this.jwtService.verify<JwtPayload>(token, { secret });
  }
}
