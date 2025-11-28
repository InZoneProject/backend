import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../auth/enums/user-role.enum';
import { Building } from '../buildings/entities/building.entity';
import { REALTIME_CONSTANTS } from './realtime.constants';
import { extractTokenFromHandshake } from '../../shared/utils/socket-token.util';

interface AuthenticatedSocket extends Socket {
  userId: number;
  role: UserRole;
  subscribedBuildings?: Set<number>;
}

interface JwtPayload {
  sub: number;
  role: UserRole;
}

interface SubscribeBuildingDto {
  building_id: number;
}

@WebSocketGateway({
  namespace: '/locations',
  cors: {
    origin: process.env.SOCKETIO_CORS_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class LocationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
  ) {}

  handleConnection(client: AuthenticatedSocket): void {
    try {
      const token = extractTokenFromHandshake(client);
      const payload = this.verifyToken(token);

      client.userId = payload.sub;
      client.role = payload.role;
      client.subscribedBuildings = new Set();

      if (payload.role !== UserRole.ORGANIZATION_ADMIN) {
        client.disconnect();
        return;
      }
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage(REALTIME_CONSTANTS.EVENTS.SUBSCRIBE_BUILDING)
  async handleSubscribeBuilding(
    @MessageBody() data: SubscribeBuildingDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    try {
      const { building_id } = data;

      if (!building_id) {
        this.sendError(
          client,
          REALTIME_CONSTANTS.MESSAGES.BUILDING_ID_REQUIRED,
        );
        return;
      }

      if (client.subscribedBuildings?.has(building_id)) {
        this.sendError(
          client,
          REALTIME_CONSTANTS.MESSAGES.ALREADY_SUBSCRIBED_BUILDING,
        );
        return;
      }

      const building = await this.buildingRepository.findOne({
        where: { building_id },
        relations: ['organization', 'organization.organization_admin'],
      });

      if (!building) {
        this.sendError(client, REALTIME_CONSTANTS.MESSAGES.BUILDING_NOT_FOUND);
        return;
      }

      if (
        building.organization?.organization_admin?.organization_admin_id !==
        client.userId
      ) {
        this.sendError(client, REALTIME_CONSTANTS.MESSAGES.ACCESS_DENIED);
        return;
      }

      const roomName = `building-${building_id}`;
      await client.join(roomName);
      client.subscribedBuildings?.add(building_id);

      this.sendSuccess(
        client,
        REALTIME_CONSTANTS.MESSAGES.SUBSCRIBED_TO_BUILDING(building_id),
      );
    } catch {
      this.sendError(client, REALTIME_CONSTANTS.MESSAGES.INTERNAL_ERROR);
    }
  }

  @SubscribeMessage(REALTIME_CONSTANTS.EVENTS.UNSUBSCRIBE_BUILDING)
  async handleUnsubscribeBuilding(
    @MessageBody() data: SubscribeBuildingDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const { building_id } = data;

    if (!building_id) {
      this.sendError(client, REALTIME_CONSTANTS.MESSAGES.BUILDING_ID_REQUIRED);
      return;
    }

    if (!client.subscribedBuildings?.has(building_id)) {
      this.sendError(
        client,
        REALTIME_CONSTANTS.MESSAGES.NOT_SUBSCRIBED_BUILDING,
      );
      return;
    }

    const roomName = `building-${building_id}`;
    await client.leave(roomName);
    client.subscribedBuildings?.delete(building_id);

    this.sendSuccess(
      client,
      REALTIME_CONSTANTS.MESSAGES.UNSUBSCRIBED_FROM_BUILDING(building_id),
    );
  }

  emitEmployeeLocationChange(
    buildingId: number,
    employeeId: number,
    zoneId: number | null,
  ): void {
    const roomName = `building-${buildingId}`;
    this.server.to(roomName).emit(REALTIME_CONSTANTS.EVENTS.EMPLOYEE_LOCATION, {
      employee_id: employeeId,
      zone_id: zoneId,
      timestamp: new Date(),
    });
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
