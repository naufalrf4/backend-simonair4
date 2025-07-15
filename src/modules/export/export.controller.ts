import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/guards/roles-guard';
import { Roles } from '@/core/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/users/entities/user.entity';
import { Response } from 'express';
import { ExportQueryDto } from './dto/export-query.dto';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get(':type/:deviceId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async exportData(
    @Param('type') type: string,
    @Param('deviceId') deviceId: string,
    @Query() query: ExportQueryDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, fileName, contentType } =
      await this.exportService.generateExport(
        type,
        deviceId,
        user,
        query,
      );

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(file);
  }
}
