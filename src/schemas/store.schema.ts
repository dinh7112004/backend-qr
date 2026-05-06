import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StoreDocument = Store & Document;

@Schema({ timestamps: true })
export class Store {
  @Prop({ required: true, unique: true })
  storeId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  address: string;

  @Prop([String])
  tableOptions: string[];

  @Prop({ type: Object })
  themeConfig: {
    themeId: string;
    themeVersion: string;
    layoutVariant: string;
  };
}

export const StoreSchema = SchemaFactory.createForClass(Store);
