import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TableDocument = Table & Document;

@Schema({ timestamps: true })
export class Table {
  @Prop({ required: true })
  storeId: string;

  @Prop({ required: true })
  name: string; // Tên bàn (Vd: Bàn 01)

  @Prop({ required: true, unique: true })
  code: string; // Mã QR (Vd: table-01)

  @Prop({ default: true })
  isActive: boolean;
}

export const TableSchema = SchemaFactory.createForClass(Table);
