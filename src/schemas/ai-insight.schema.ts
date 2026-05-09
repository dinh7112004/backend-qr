import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AiInsight extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'info' }) // info, warning, trend_up, trend_down
  type: string;

  @Prop({ required: true })
  category: string; // product, revenue, space, etc.

  @Prop()
  suggestion: string; // Tên món hoặc hành động gợi ý

  @Prop()
  actionText: string; // ví dụ: "Tạo món"
}

export const AiInsightSchema = SchemaFactory.createForClass(AiInsight);
