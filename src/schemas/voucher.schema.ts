import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VoucherDocument = Voucher & Document;

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: ['percentage', 'fixed'] })
  discountType: string;

  @Prop({ required: true })
  discountValue: number;

  @Prop({ default: 0 })
  minOrderValue: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isHidden: boolean;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop()
  maxUsage: number;

  @Prop({ default: 0 })
  minOrdersRequired: number;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);
