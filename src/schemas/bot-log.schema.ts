import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BotLog extends Document {
  @Prop({ required: true })
  text: string;

  @Prop({ default: 'info' }) // info, warning, success, error
  type: string;

  @Prop({ default: () => new Date().toLocaleTimeString('vi-VN') })
  time: string;
}

export const BotLogSchema = SchemaFactory.createForClass(BotLog);
