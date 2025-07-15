import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SensorsService } from '@/modules/sensors/sensors.service';
import { FishService } from '@/modules/fish/fish.service';
import { FeedService } from '@/modules/feed/feed.service';
import { DevicesService } from '@/modules/devices/devices.service';
import { User } from '@/modules/users/entities/user.entity';
import { ExportQueryDto } from './dto/export-query.dto';
import { FileGeneratorUtil } from './utils/file-generator.util';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ExportService {
  constructor(
    private readonly sensorsService: SensorsService,
    private readonly fishService: FishService,
    private readonly feedService: FeedService,
    private readonly devicesService: DevicesService,
  ) {}

  async generateExport(
    type: string,
    deviceId: string,
    user: User,
    options: ExportQueryDto,
  ): Promise<{ file: Buffer; fileName: string; contentType: string }> {
    await this.validateDeviceAccess(user, deviceId);

    const data = await this.getData(type, deviceId, user, options);
    const { file, fileName, contentType } = await this.formatData(
      data,
      type,
      options.format || 'csv',
      deviceId,
    );

    return { file, fileName, contentType };
  }

  private async validateDeviceAccess(user: User, deviceId: string) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER) {
      return;
    }
    const device = await this.devicesService.findOne(deviceId, user);
    if (!device || device.user_id !== user.id) {
      throw new UnauthorizedException('Access to this device is denied');
    }
  }

  private async getData(
    type: string,
    deviceId: string,
    user: User,
    options: ExportQueryDto,
  ): Promise<any[]> {
    const { from, to } = options;
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();

    switch (type) {
      case 'sensor-data':
        return this.sensorsService.getHistoricalData(
          deviceId,
          fromDate,
          toDate,
        );
      case 'fish-growth':
        return this.fishService.findAll(user, deviceId, fromDate, toDate);
      case 'feed':
        return this.feedService.findAll(user, deviceId, fromDate, toDate);
      case 'full-report':
        return this.getFullReportData(user, deviceId, fromDate, toDate);
      default:
        throw new NotFoundException('Export type not found');
    }
  }

  private async getFullReportData(
    user: User,
    deviceId: string,
    from: Date,
    to: Date,
  ): Promise<any[]> {
    const [sensorData, fishGrowth, feedData] = await Promise.all([
      this.sensorsService.getHistoricalData(deviceId, from, to),
      this.fishService.findAll(user, deviceId, from, to),
      this.feedService.findAll(user, deviceId, from, to),
    ]);

    return [
      { type: 'Sensor Data', data: sensorData },
      { type: 'Fish Growth', data: fishGrowth },
      { type: 'Feed Data', data: feedData },
    ];
  }

  private async formatData(
    data: any[],
    type: string,
    format: string,
    deviceId: string,
  ): Promise<{ file: Buffer; fileName: string; contentType: string }> {
    const timestamp = new Date().toISOString();
    const fileName = `${type}-${deviceId}-${timestamp}.${format}`;
    let file: Buffer;
    let contentType: string;

    switch (format) {
      case 'csv':
        file = await FileGeneratorUtil.generateCsv(data);
        contentType = 'text/csv';
        break;
      case 'excel':
        file = await FileGeneratorUtil.generateExcel(data, type);
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'pdf':
        file = await FileGeneratorUtil.generatePdf(data, type);
        contentType = 'application/pdf';
        break;
      case 'json':
        file = await FileGeneratorUtil.generateJson(data);
        contentType = 'application/json';
        break;
      default:
        throw new NotFoundException('Format not supported');
    }

    return { file, fileName, contentType };
  }
}
