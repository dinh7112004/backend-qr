import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MenuItemDocument = MenuItem & Document;

@Schema({ timestamps: true })
export class MenuItem {
  @Prop({ required: true })
  storeId: string;

  @Prop({ required: true })
  categoryCode: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, type: Object })
  name: { 'vi-VN': string; en?: string };

  @Prop({ type: Object })
  desc: { 'vi-VN': string; en?: string };

  @Prop({ required: true })
  price: number;

  @Prop()
  oldPrice?: number;

  @Prop()
  image: string;

  @Prop([String])
  tags: string[];

  @Prop()
  color?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

export type CategoryDocument = Category & Document;

@Schema()
export class Category {
  @Prop({ required: true })
  storeId: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, type: Object })
  name: { 'vi-VN': string; en?: string };
}

export const CategorySchema = SchemaFactory.createForClass(Category);
