import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get('live')
  @ApiOperation({ summary: 'Health live', description: 'Kiểm tra service đang chạy.' })
  getLive() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Health ready', description: 'Kiểm tra readiness của DB/adapters.' })
  async getReady() {
    const isDbConnected = this.connection.readyState === 1;
    if (isDbConnected) {
      return { status: 'OK', database: 'connected', timestamp: new Date().toISOString() };
    }
    return { status: 'ERROR', database: 'disconnected', timestamp: new Date().toISOString() };
  }
}
