import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  phone: string;

  @Prop()
  password?: string;

  @Prop()
  displayName: string;

  @Prop({ default: 'customer' })
  role: string; // customer, merchant, admin

  @Prop({ default: 0 })
  loyaltyPoints: number;

  @Prop({ default: 'Bronze' })
  loyaltyTier: string;

  @Prop({ type: [String], default: [] })
  favoriteIds: string[];

  @Prop()
  deviceId?: string;

  @Prop({ type: [String], default: [] })
  usedVoucherCodes: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
