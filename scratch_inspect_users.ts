import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './src/schemas/user.schema';
import { Model } from 'mongoose';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userModel = app.get<Model<any>>(getModelToken(User.name));
  
  const users = await userModel.find({}).exec();
  console.log('--- USER LIST ---');
  users.forEach(u => {
    console.log(`ID: ${u._id}, Phone: ${u.phone}, DeviceID: ${u.deviceId}, Name: ${u.displayName}`);
  });
  console.log('-----------------');

  const specific = await userModel.findOne({ phone: 'device-genz-ios-9xldl' }).exec();
  console.log('Specific search by phone:', specific ? 'FOUND' : 'NOT FOUND');
  if (specific) console.log(specific);

  const byDevice = await userModel.findOne({ deviceId: 'device-genz-ios-9xldl' }).exec();
  console.log('Specific search by deviceId:', byDevice ? 'FOUND' : 'NOT FOUND');
  if (byDevice) console.log(byDevice);
  
  await app.close();
}

run();
