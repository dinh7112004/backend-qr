import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { MenuItem } from './schemas/menu.schema';
import { Category } from './schemas/menu.schema';
import { Store } from './schemas/store.schema';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const menuItemModel = app.get<Model<any>>(getModelToken(MenuItem.name));
  const categoryModel = app.get<Model<any>>(getModelToken(Category.name));
  const storeModel = app.get<Model<any>>(getModelToken(Store.name));
  const userModel = app.get<Model<any>>(getModelToken(User.name));

  const storeId = 'store-genz-01';

  console.log('Cleaning up old data...');
  await menuItemModel.deleteMany({});
  await categoryModel.deleteMany({});
  await storeModel.deleteMany({});
  
  // RESET ALL LOYALTY POINTS TO 0
  console.log('Resetting all loyalty points to 0...');
  await userModel.updateMany({}, { $set: { loyaltyPoints: 0 } });

  console.log('Seeding Store...');
  await storeModel.create({
    storeId,
    name: 'Boba Babe ✨',
    address: '123 Phan Xích Long, Phú Nhuận, TP.HCM',
    tableOptions: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'A1', 'A2', 'A3'],
    themeConfig: {
      themeId: 'gen-z-pink',
      themeVersion: '1.0.0',
      layoutVariant: 'grid'
    }
  });

  console.log('Seeding Categories...');
  const categories = [
    { storeId, code: 'tea', name: { 'vi-VN': 'Trà Sữa ✨', en: 'Milk Tea' } },
    { storeId, code: 'coffee', name: { 'vi-VN': 'Cafe Insta 📸', en: 'Instagram Coffee' } },
    { storeId, code: 'cake', name: { 'vi-VN': 'Bánh Ngọt 🍰', en: 'Cakes' } },
    { storeId, code: 'snack', name: { 'vi-VN': 'Đồ Ăn Vặt 🍟', en: 'Snacks' } },
    { storeId, code: 'topping', name: { 'vi-VN': 'Topping Cute 🍡', en: 'Toppings' } },
  ];
  await categoryModel.insertMany(categories);

  console.log('Seeding Menu Items...');
  const items = [
    {
      storeId,
      categoryCode: 'topping',
      code: 'TOP-001',
      name: { 'vi-VN': 'Trân châu bọt biển', en: 'Bubble Boba' },
      desc: { 'vi-VN': 'Dai dai giòn giòn siêu dính', en: 'Chewy and crunchy' },
      price: 8000,
      image: 'https://images.unsplash.com/photo-1594498653385-d5172c532c00?q=80&w=400',
      tags: ['BEST'],
      color: '#ffd6c2',
      isActive: true
    },
    {
      storeId,
      categoryCode: 'topping',
      code: 'TOP-002',
      name: { 'vi-VN': 'Pudding trứng mịn', en: 'Egg Pudding' },
      desc: { 'vi-VN': 'Mềm mịn tan ngay trong miệng', en: 'Smooth and melting' },
      price: 10000,
      image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=400',
      tags: ['HOT'],
      color: '#ff6b9d',
      isActive: true
    },
    {
      storeId,
      categoryCode: 'topping',
      code: 'TOP-003',
      name: { 'vi-VN': 'Bọt kem cheese', en: 'Cheese Foam' },
      desc: { 'vi-VN': 'Béo ngậy mặn mặn cực cuốn', en: 'Rich and salty' },
      price: 12000,
      image: 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?q=80&w=400',
      tags: ['NEW'],
      color: '#b8e8d3',
      isActive: true
    },
    {
      storeId,
      categoryCode: 'tea',
      code: 'TS-001',
      name: { 'vi-VN': 'Trà sữa hoàng kim', en: 'Golden Boba Milk Tea' },
      desc: { 'vi-VN': 'Vị trà đậm đà, trân châu dai giòn sần sật ❤️', en: 'Rich tea with chewy boba' },
      price: 39000,
      oldPrice: 49000,
      image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?q=80&w=400',
      tags: ['HOT', 'SALE'],
      color: '#ff6b9d',
      isActive: true
    },
    {
      storeId,
      categoryCode: 'tea',
      code: 'TS-002',
      name: { 'vi-VN': 'Caramel cloud sủi bọt', en: 'Caramel Cloud Foam' },
      desc: { 'vi-VN': 'Lớp kem béo ngậy tan chảy như mây ☁️', en: 'Rich cream foam melting like clouds' },
      price: 45000,
      image: 'https://images.unsplash.com/photo-1497636577773-f1231844b336?q=80&w=400',
      tags: ['NEW'],
      color: '#b8e8d3',
      isActive: true
    },
    {
      storeId,
      categoryCode: 'coffee',
      code: 'CF-001',
      name: { 'vi-VN': 'Bạc xỉu sương mù', en: 'Foggy Bac Xiu' },
      desc: { 'vi-VN': 'Cafe tầng lớp nghệ thuật, đẹp không nỡ uống 📸', en: 'Layered coffee, beautiful vibe' },
      price: 35000,
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=400',
      tags: ['INSTA'],
      color: '#ffd6c2',
      isActive: true
    },
    {
      storeId,
      categoryCode: 'cake',
      code: 'BK-001',
      name: { 'vi-VN': 'Mousse dâu tây cute', en: 'Cute Strawberry Mousse' },
      desc: { 'vi-VN': 'Lên hình cực xinh, ăn cực dính 🍓', en: 'Looks great, tastes amazing' },
      price: 52000,
      image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?q=80&w=400',
      tags: ['BEST'],
      color: '#ff6b9d',
      isActive: true
    }
  ];
  await menuItemModel.insertMany(items);

  console.log('Seeding Users...');
  // Check if users exist before deleting or just add if missing
  const adminExists = await userModel.findOne({ phone: '0900111111' });
  if (!adminExists) {
    await userModel.create({
      phone: '0900111111',
      displayName: 'Quang Dinh (Admin)',
      role: 'merchant',
      loyaltyPoints: 0,
      loyaltyTier: 'Gold'
    });
  }

  const customerExists = await userModel.findOne({ phone: '0987654321' });
  if (!customerExists) {
    await userModel.create({
      phone: '0987654321',
      displayName: 'Gen-Z Customer',
      role: 'customer',
      loyaltyPoints: 500,
      loyaltyTier: 'Silver',
      favoriteIds: []
    });
  }

  console.log('Seeding Done! 🚀');
  await app.close();
}

bootstrap();
