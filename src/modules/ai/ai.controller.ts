import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() body: { senderId: string; message: string }) {
    const reply = await this.aiService.processUserMessage(body.senderId, body.message);
    return { reply };
  }

  @Get('dashboard')
  async getDashboard() {
    return this.aiService.getDashboardData();
  }

  @Post('analyze')
  async triggerAnalysis() {
    await this.aiService.runAnalysis();
    return { success: true };
  }
}
