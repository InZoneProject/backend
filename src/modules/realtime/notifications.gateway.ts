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
import type { AuthenticatedSocket } from './interfaces/authenticated-socket.interface';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { NotificationPayload } from './interfaces/notification-payload.interface';
import type { OrganizationChangedPayload } from './interfaces/organization-changed-payload.interface';
import type { OrganizationMemberJoinedPayload } from './interfaces/organization-member-joined-payload.interface';
import type { OrganizationMemberRemovedPayload } from './interfaces/organization-member-removed-payload.interface';

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

  emitOrganizationJoinedToEmployee(
    employeeId: number,
    payload: OrganizationChangedPayload,
  ): void {
    const roomName = `employee-${employeeId}`;
    this.server
      .to(roomName)
      .emit(REALTIME_CONSTANTS.EVENTS.ORGANIZATION_JOINED, payload);
  }

  emitOrganizationRemovedFromEmployee(
    employeeId: number,
    payload: OrganizationChangedPayload,
  ): void {
    const roomName = `employee-${employeeId}`;
    this.server
      .to(roomName)
      .emit(REALTIME_CONSTANTS.EVENTS.ORGANIZATION_REMOVED, payload);
  }

  emitOrganizationMemberJoinedToAdmin(
    organizationAdminId: number,
    payload: OrganizationMemberJoinedPayload,
  ): void {
    const roomName = `org-admin-${organizationAdminId}`;
    this.server
      .to(roomName)
      .emit(REALTIME_CONSTANTS.EVENTS.ORGANIZATION_MEMBER_JOINED, payload);
  }

  emitOrganizationMemberRemovedToAdmin(
    organizationAdminId: number,
    payload: OrganizationMemberRemovedPayload,
  ): void {
    const roomName = `org-admin-${organizationAdminId}`;
    this.server
      .to(roomName)
      .emit(REALTIME_CONSTANTS.EVENTS.ORGANIZATION_MEMBER_REMOVED, payload);
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
