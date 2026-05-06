import { Module } from '@nestjs/common';
import { AuthController, MeController } from './auth.controller';

import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthController, MeController],
})
export class AuthModule {}
