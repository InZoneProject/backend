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
import { Door } from '../buildings/entities/door.entity';
import { Floor } from '../buildings/entities/floor.entity';
import { Zone } from '../buildings/entities/zone.entity';
import { Employee } from '../employees/entities/employee.entity';
import { REALTIME_CONSTANTS } from './realtime.constants';
import { extractTokenFromHandshake } from '../../shared/utils/socket-token.util';

interface AuthenticatedSocket extends Socket {
  userId: number;
  role: UserRole;
  subscribedBuildings?: Set<number>;
  subscribedFloors?: Set<number>;
}

interface JwtPayload {
  sub: number;
  role: UserRole;
}

interface SubscribeBuildingDto {
  building_id: number;
}

interface SubscribeFloorDto {
  floor_id: number;
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
    @InjectRepository(Floor)
    private readonly floorRepository: Repository<Floor>,
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  handleConnection(client: AuthenticatedSocket): void {
    try {
      const token = extractTokenFromHandshake(client);
      const payload = this.verifyToken(token);

      client.userId = payload.sub;
      client.role = payload.role;
      client.subscribedBuildings = new Set();
      client.subscribedFloors = new Set();

      if (payload.role !== UserRole.ORGANIZATION_ADMIN) {
        client.disconnect();
        return;
      }
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage(REALTIME_CONSTANTS.EVENTS.SUBSCRIBE_FLOOR)
  async handleSubscribeFloor(
    @MessageBody() data: SubscribeFloorDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    try {
      const { floor_id } = data;

      if (!floor_id) {
        this.sendError(client, REALTIME_CONSTANTS.MESSAGES.FLOOR_ID_REQUIRED);
        return;
      }

      if (client.subscribedFloors?.has(floor_id)) {
        this.sendError(
          client,
          REALTIME_CONSTANTS.MESSAGES.ALREADY_SUBSCRIBED_FLOOR,
        );
        return;
      }

      const floor = await this.floorRepository.findOne({
        where: { floor_id },
        relations: [
          'building',
          'building.organization',
          'building.organization.organization_admin',
        ],
      });

      if (!floor) {
        this.sendError(client, REALTIME_CONSTANTS.MESSAGES.FLOOR_NOT_FOUND);
        return;
      }

      if (
        floor.building.organization?.organization_admin
          ?.organization_admin_id !== client.userId
      ) {
        this.sendError(client, REALTIME_CONSTANTS.MESSAGES.ACCESS_DENIED);
        return;
      }

      const roomName = `floor-${floor_id}`;
      await client.join(roomName);
      client.subscribedFloors?.add(floor_id);

      this.sendSuccess(
        client,
        REALTIME_CONSTANTS.MESSAGES.SUBSCRIBED_TO_FLOOR(floor_id),
      );
    } catch {
      this.sendError(client, REALTIME_CONSTANTS.MESSAGES.INTERNAL_ERROR);
    }
  }

  @SubscribeMessage(REALTIME_CONSTANTS.EVENTS.UNSUBSCRIBE_FLOOR)
  async handleUnsubscribeFloor(
    @MessageBody() data: SubscribeFloorDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const { floor_id } = data;

    if (!floor_id) {
      this.sendError(client, REALTIME_CONSTANTS.MESSAGES.FLOOR_ID_REQUIRED);
      return;
    }

    if (!client.subscribedFloors?.has(floor_id)) {
      this.sendError(client, REALTIME_CONSTANTS.MESSAGES.NOT_SUBSCRIBED_FLOOR);
      return;
    }

    const roomName = `floor-${floor_id}`;
    await client.leave(roomName);
    client.subscribedFloors?.delete(floor_id);

    this.sendSuccess(
      client,
      REALTIME_CONSTANTS.MESSAGES.UNSUBSCRIBED_FROM_FLOOR(floor_id),
    );
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

  async emitEmployeeLocationChange(
    buildingId: number,
    employeeId: number,
    doorId: number,
    zoneId: number | null,
    previousZoneId: number | null = null,
  ): Promise<void> {
    const [employee, door, zone, previousZone] = await Promise.all([
      this.employeeRepository.findOne({ where: { employee_id: employeeId } }),
      this.floorRepository.manager.findOne(Door, {
        where: { door_id: doorId },
        relations: ['floor'],
      }),
      zoneId
        ? this.zoneRepository.findOne({
            where: { zone_id: zoneId },
            relations: ['floor'],
          })
        : Promise.resolve(null),
      previousZoneId
        ? this.zoneRepository.findOne({
            where: { zone_id: previousZoneId },
            relations: ['floor'],
          })
        : Promise.resolve(null),
    ]);

    const payload = {
      employee_id: employeeId,
      door_id: doorId,
      zone_id: zoneId,
      previous_zone_id: previousZoneId,
      floor_id: zone?.floor?.floor_id ?? door?.floor?.floor_id ?? null,
      floor_number:
        zone?.floor?.floor_number ?? door?.floor?.floor_number ?? null,
      previous_floor_id: previousZone?.floor?.floor_id ?? null,
      full_name: employee?.full_name ?? '',
      email: employee?.email ?? '',
      photo: employee?.photo ?? null,
      timestamp: new Date(),
    };

    const roomName = `building-${buildingId}`;
    this.server
      .to(roomName)
      .emit(REALTIME_CONSTANTS.EVENTS.EMPLOYEE_LOCATION, payload);

    const floorIds = new Set<number>();
    if (zone?.floor?.floor_id) floorIds.add(zone.floor.floor_id);
    if (door?.floor?.floor_id) floorIds.add(door.floor.floor_id);
    if (previousZone?.floor?.floor_id)
      floorIds.add(previousZone.floor.floor_id);
    for (const floorId of floorIds) {
      this.server
        .to(`floor-${floorId}`)
        .emit(REALTIME_CONSTANTS.EVENTS.EMPLOYEE_LOCATION, payload);
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
