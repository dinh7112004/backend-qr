import { Controller, Get, Post, Body, Patch, Param, Query, Put, Headers, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiHeader } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateOrderStatusDto, CreateMenuItemDto, ToggleActiveDto } from './dto/merchant.dto';
import { MenuItem, MenuItemDocument, Category, CategoryDocument } from '../../schemas/menu.schema';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { Store, StoreDocument } from '../../schemas/store.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Voucher, VoucherDocument } from '../../schemas/voucher.schema';
import { Scan, ScanDocument } from '../../schemas/scan.schema';
import { StoryTag, StoryTagDocument } from '../../schemas/story-tag.schema';
import { Review, ReviewDocument } from '../../schemas/review.schema';
import { Table, TableDocument } from '../../schemas/table.schema';

@ApiTags('Merchant')
@Controller('merchant')
export class MerchantController {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
    @InjectModel(Scan.name) private scanModel: Model<ScanDocument>,
    @InjectModel(StoryTag.name) private storyTagModel: Model<StoryTagDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
  ) {}

  @Get('orders')
  @ApiOperation({ summary: 'Danh sách đơn hàng merchant' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getOrders(@Query('storeId') storeId?: string, @Query('status') status?: string) {
    const query: any = {};
    if (storeId) query.storeId = storeId;
    if (status) query.status = status;
    const items = await this.orderModel.find(query).sort({ createdAt: -1 }).exec();
    return { items };
  }

  @Post('metrics/story-tag')
  @ApiOperation({ summary: 'Ghi nhận khách tag IG Story thủ công' })
  async recordStoryTag(@Body() body: { storeId?: string, username?: string }) {
    const username = body.username || 'unknown';
    const tag = new this.storyTagModel({
      storeId: body.storeId || 'store-genz-01',
      username: username
    });
    await tag.save();

    if (username !== 'unknown') {
      const user = await this.userModel.findOneAndUpdate(
        { instagramUsername: username },
        { $inc: { loyaltyPoints: 500 } },
        { new: true }
      );
    }

    return { success: true };
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Lấy danh sách đánh giá của khách hàng' })
  async getReviews(@Query('storeId') storeId: string = 'store-genz-01') {
    const reviews = await this.reviewModel.find({ storeId }).sort({ createdAt: -1 });
    return { items: reviews };
  }

  @Patch('reviews/:id/reply')
  @ApiOperation({ summary: 'Phản hồi đánh giá' })
  async replyReview(@Param('id') id: string, @Body() body: { reply: string }) {
    const review = await this.reviewModel.findByIdAndUpdate(id, { merchantReply: body.reply }, { new: true });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return { success: true, review };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Lấy các chỉ số thống kê' })
  @ApiQuery({ name: 'storeId', required: false })
  async getMetrics(@Query('storeId') storeId?: string) {
    const sId = storeId || 'store-genz-01';
    
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    // Helper to get stats for a range
    const getStats = async (start?: Date, end?: Date) => {
      const query: any = { storeId: sId };
      if (start || end) {
        query.createdAt = {};
        if (start) query.createdAt.$gte = start;
        if (end) query.createdAt.$lt = end;
      }
      
      const scans = await this.scanModel.countDocuments(query);
      const orders = await this.orderModel.find({ ...query, status: 'completed' });
      const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      const tags = await this.storyTagModel.countDocuments(query);

      return { scans, ordersCount: orders.length, revenue, tags };
    };

    const today = await getStats(startOfDay, new Date(now.getTime() + 86400000));
    const yesterday = await getStats(startOfYesterday, startOfDay);
    const allTime = await getStats();

    const calculateTrend = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    };

    return {
      scansToday: today.scans,
      scansTrend: calculateTrend(today.scans, yesterday.scans),
      completedOrdersToday: allTime.ordersCount, // Changed to total as requested
      ordersTrend: calculateTrend(today.ordersCount, yesterday.ordersCount),
      revenueToday: allTime.revenue, // Changed to total as requested
      revenueTrend: calculateTrend(today.revenue, yesterday.revenue),
      storyTagsToday: today.tags,
      storyTagsTrend: calculateTrend(today.tags, yesterday.tags)
    };
  }

  @Patch('orders/:orderId/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn' })
  async updateOrderStatus(@Param('orderId') orderId: string, @Body() body: UpdateOrderStatusDto) {
    const order = await this.orderModel.findOneAndUpdate({ orderId }, { status: body.status }, { new: true });
    return { success: true, order };
  }

  @Get('tables')
  @ApiOperation({ summary: 'Danh sách bàn' })
  async getTables(@Query('storeId') storeId: string = 'store-genz-01') {
    const items = await this.tableModel.find({ storeId }).sort({ name: 1 });
    return { items };
  }

  @Post('tables')
  @ApiOperation({ summary: 'Thêm bàn mới' })
  async createTable(@Body() body: { storeId: string, name: string, code: string }) {
    const table = await this.tableModel.create({
      storeId: body.storeId || 'store-genz-01',
      name: body.name,
      code: body.code || `table-${Date.now()}`,
    });
    return { success: true, item: table };
  }

  @Patch('tables/:id')
  @ApiOperation({ summary: 'Cập nhật bàn' })
  async updateTable(@Param('id') id: string, @Body() body: any) {
    const updated = await this.tableModel.findByIdAndUpdate(id, body, { new: true });
    return { success: true, item: updated };
  }

  @Post('tables/:id/delete')
  @ApiOperation({ summary: 'Xoá bàn' })
  async deleteTable(@Param('id') id: string) {
    await this.tableModel.findByIdAndDelete(id);
    return { success: true };
  }

  @Get('menu/items')
  @ApiOperation({ summary: 'Danh sách menu item' })
  async getMenuItems(@Query('storeId') storeId: string = 'store-genz-01') {
    const items = await this.menuItemModel.find({ storeId }).exec();
    
    // Calculate total sold count for each item from all-time completed orders
    const allCompletedOrders = await this.orderModel.find({ storeId, status: 'completed' }).exec();
    const salesMap: Record<string, number> = {};
    
    allCompletedOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const id = item.itemId;
          if (id) {
            salesMap[id] = (salesMap[id] || 0) + (item.quantity || 0);
          }
        });
      }
    });

    const itemsWithSales = items.map(item => ({
      ...item.toObject(),
      soldCount: salesMap[item._id.toString()] || salesMap[item.code] || 0
    }));

    return { items: itemsWithSales };
  }

  @Post('menu/items')
  @ApiOperation({ summary: 'Tạo món mới' })
  async createMenuItem(@Body() body: CreateMenuItemDto) {
    const { description, imageUrl, ...rest } = body as any;
    const created = await this.menuItemModel.create({ ...rest, desc: description, image: imageUrl });
    return { success: true, item: created };
  }

  @Patch('menu/items/:itemId')
  async updateMenuItem(@Param('itemId') itemId: string, @Body() body: any) {
    const updated = await this.menuItemModel.findByIdAndUpdate(itemId, body, { new: true });
    return { success: true, item: updated };
  }

  @Post('menu/items/:itemId/delete')
  async deleteMenuItem(@Param('itemId') itemId: string) {
    await this.menuItemModel.findByIdAndDelete(itemId);
    return { success: true };
  }

  @Get('menu/categories')
  async getCategories(@Query('storeId') storeId: string = 'store-genz-01') {
    const items = await this.categoryModel.find({ storeId }).exec();
    return { items };
  }

  @Post('menu/categories')
  async createCategory(@Body() body: any) {
    const created = await this.categoryModel.create({
      storeId: body.storeId || 'store-genz-01',
      code: body.code || body.name['vi-VN'].toLowerCase().replace(/ /g, '-'),
      name: body.name
    });
    return { success: true, item: created };
  }

  @Get('vouchers')
  async getVouchers() {
    const items = await this.voucherModel.find().sort({ createdAt: -1 });
    return { items };
  }
}
