import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientController } from './client.controller';
import { MenuItem, MenuItemSchema, Category, CategorySchema } from '../../schemas/menu.schema';
import { Store, StoreSchema } from '../../schemas/store.schema';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Voucher, VoucherSchema } from '../../schemas/voucher.schema';
import { Scan, ScanSchema } from '../../schemas/scan.schema';
import { Review, ReviewSchema } from '../../schemas/review.schema';
import { Table, TableSchema } from '../../schemas/table.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Store.name, schema: StoreSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Voucher.name, schema: VoucherSchema },
      { name: Scan.name, schema: ScanSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Table.name, schema: TableSchema }
    ])
  ],
  controllers: [ClientController]
})
export class ClientModule {}
