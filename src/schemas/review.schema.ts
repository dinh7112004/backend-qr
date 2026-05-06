import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true })
  storeId: string;

  @Prop({ required: true })
  orderId: string;

  @Prop()
  customerName: string;

  @Prop({ required: true })
  rating: number; // 1 to 5

  @Prop()
  comment: string;

  @Prop([String])
  tags: string[]; // e.g. ["Ngon", "Sạch sẽ", "Phục vụ tốt"]

  @Prop()
  merchantReply: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
