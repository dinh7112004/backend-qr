import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Chat extends Document {
  @Prop({ required: true })
  senderId: string; // ID khách hàng hoặc device ID

  @Prop({ required: true })
  role: string; // 'user' hoặc 'model'

  @Prop({ required: true })
  content: string;

  @Prop()
  storeId: string;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
