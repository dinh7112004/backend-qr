import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ChatSchema } from '../../schemas/chat.schema';
import { AiInsightSchema } from '../../schemas/ai-insight.schema';
import { BotLogSchema } from '../../schemas/bot-log.schema';
import { MenuItemSchema } from '../../schemas/menu.schema';
import { OrderSchema } from '../../schemas/order.schema';
import { ReviewSchema } from '../../schemas/review.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Chat', schema: ChatSchema },
      { name: 'AiInsight', schema: AiInsightSchema },
      { name: 'BotLog', schema: BotLogSchema },
      { name: 'MenuItem', schema: MenuItemSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'Review', schema: ReviewSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
