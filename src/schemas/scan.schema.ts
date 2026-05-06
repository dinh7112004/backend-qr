import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ScanDocument = Scan & Document;

@Schema({ timestamps: true })
export class Scan {
  @Prop({ required: true })
  storeId: string;

  @Prop()
  tableCode: string;

  @Prop()
  deviceInfo: string;
}

export const ScanSchema = SchemaFactory.createForClass(Scan);
