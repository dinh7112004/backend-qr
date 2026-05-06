import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ClientModule } from './modules/client/client.module';
import { HealthModule } from './modules/health/health.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartmenu'),
    AuthModule,
    ClientModule,
    HealthModule,
    MerchantModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
