import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { DevicesService } from '../devices/devices.service';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from '@/core/auth/guards/ws-jwt.guard';
import { UserRole } from '../users/entities/user.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly devicesService: DevicesService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    const token = client.handshake.auth.token;

    if (!token) {
      this.logger.warn(`Client ${client.id} has no token. Disconnecting.`);
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });
      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        this.logger.warn(
          `User not found for client ${client.id}. Disconnecting.`,
        );
        client.disconnect();
        return;
      }

      client.data.user = user;

      const devices = await this.devicesService.findAll(user);
      devices.forEach((device) => {
        const room = `device:${device.device_id}`;
        client.join(room);
        this.logger.log(
          `Client ${client.id} (User: ${user.full_name}) joined room ${room}`,
        );
      });

      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER) {
        client.join('all-devices');
        this.logger.log(`Admin client ${client.id} joined room all-devices`);
      }
    } catch (error) {
      this.logger.error(
        `Authentication failed for client ${client.id}: ${error.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  broadcast(deviceId: string, data: any) {
    const room = `device:${deviceId}`;
    this.server.to(room).emit('sensorUpdate', data);
    this.logger.log(`Broadcasted sensor update to room ${room}`, {
      deviceId,
      dataKeys: Object.keys(data),
      timestamp: data.timestamp || data.time,
      isRealtime: data.realtime || false,
      source: data.source || 'database'
    });
  }

  // Enhanced broadcast method for real-time MQTT data
  broadcastRealtime(deviceId: string, data: any) {
    const room = `device:${deviceId}`;
    const realtimeData = {
      ...data,
      realtime: true,
      source: 'mqtt',
      timestamp: new Date().toISOString()
    };
    
    this.server.to(room).emit('realtimeSensorUpdate', realtimeData);
    this.logger.log(`Broadcasted real-time sensor update to room ${room}`, {
      deviceId,
      dataKeys: Object.keys(data),
    });
  }

  // Broadcast sensor status changes
  broadcastStatus(deviceId: string, status: any) {
    const room = `device:${deviceId}`;
    this.server.to(room).emit('deviceStatus', {
      deviceId,
      status,
      timestamp: new Date().toISOString()
    });
    this.logger.log(`Broadcasted device status to room ${room}`, {
      deviceId,
      status
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_device_room')
  handleJoinDeviceRoom(client: Socket, payload: { deviceId: string }) {
    const room = `device:${payload.deviceId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined device room: ${room}`);
    
    // Send confirmation
    client.emit('roomJoined', {
      room,
      deviceId: payload.deviceId,
      timestamp: new Date().toISOString()
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, room: string) {
    // This can be used for custom room joining logic if needed
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
  }
}
