import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema()
class OrderItem {
  @Prop({ required: true })
  itemId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  lineTotal: number;

  @Prop()
  size?: string;

  @Prop([String])
  toppings?: string[];

  @Prop()
  image?: string;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderId: string;

  @Prop({ required: true })
  storeId: string;

  @Prop()
  tableCode: string;

  @Prop()
  customerName: string;

  @Prop()
  customerPhone: string;

  @Prop()
  note: string;

  @Prop()
  paymentMethod: string;

  @Prop()
  voucherCode: string;

  @Prop()
  memberDiscountRate: number;

  @Prop({ required: true })
  subtotal: number;

  @Prop({ required: true })
  discount: number;

  @Prop({ required: true })
  serviceFee: number;

  @Prop({ required: true })
  total: number;

  @Prop({ default: 'pending' })
  status: string; // pending, confirmed, preparing, ready, served, cancelled

  @Prop({ type: [OrderItem] })
  items: OrderItem[];

  @Prop()
  idempotencyKey: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
