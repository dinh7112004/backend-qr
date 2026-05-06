import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StoryTagDocument = StoryTag & Document;

@Schema({ timestamps: true })
export class StoryTag {
  @Prop({ required: true })
  storeId: string;

  @Prop()
  username: string;
}

export const StoryTagSchema = SchemaFactory.createForClass(StoryTag);
