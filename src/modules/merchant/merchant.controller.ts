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
    const tag = new this.storyTagModel({
      storeId: body.storeId || 'store-genz-01',
      username: body.username || 'unknown'
    });
    await tag.save();
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

  @Get('webhook/instagram')
  @ApiOperation({ summary: 'Xác thực Webhook từ Facebook/Instagram' })
  async verifyWebhook(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    const VERIFY_TOKEN = process.env.IG_VERIFY_TOKEN || 'bobababe_secret_token';
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook Verified!');
      return challenge;
    }
    throw new NotFoundException('Xác thực thất bại');
  }

  @Post('webhook/instagram')
  @ApiOperation({ summary: 'Nhận Webhook từ Facebook/Instagram (Story Mentions)' })
  async handleInstagramWebhook(@Body() body: any) {
    console.log('Received IG Webhook:', JSON.stringify(body, null, 2));

    if (body.object === 'instagram') {
      for (const entry of body.entry) {
        // Handle changes (mentions)
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'mentions') {
              // A user mentioned the business account in a comment, caption, or story
              const mediaType = change.value.media_type; // 'STORY' or 'MEDIA'
              
              if (mediaType === 'STORY') {
                const tag = new this.storyTagModel({
                  storeId: 'store-genz-01', // Ideally mapped from IG Account ID
                  username: change.value.username || 'ig_user'
                });
                await tag.save();
              }
            }
          }
        }
      }
      return { success: true }; // Must return 200 OK fast
    }
    
    return { success: false };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Lấy các chỉ số thống kê trong ngày' })
  @ApiQuery({ name: 'storeId', required: false })
  async getMetrics(@Query('storeId') storeId?: string) {
    const sId = storeId || 'store-genz-01';
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    // Today's data
    const scansToday = await this.scanModel.countDocuments({
      storeId: sId,
      createdAt: { $gte: startOfDay }
    });

    const completedOrdersToday = await this.orderModel.find({
      storeId: sId,
      status: 'completed',
      createdAt: { $gte: startOfDay }
    });

    const ordersCountToday = completedOrdersToday.length;
    const revenueToday = completedOrdersToday.reduce((sum, order) => {
      return sum + (order.total || 0);
    }, 0);

    // Yesterday's data
    const scansYesterday = await this.scanModel.countDocuments({
      storeId: sId,
      createdAt: { $gte: startOfYesterday, $lt: startOfDay }
    });

    const completedOrdersYesterday = await this.orderModel.find({
      storeId: sId,
      status: 'completed',
      createdAt: { $gte: startOfYesterday, $lt: startOfDay }
    });

    const ordersCountYesterday = completedOrdersYesterday.length;
    const revenueYesterday = completedOrdersYesterday.reduce((sum, order) => {
      return sum + (order.total || 0);
    }, 0);

    const storyTagsToday = await this.storyTagModel.countDocuments({
      storeId: sId,
      createdAt: { $gte: startOfDay }
    });
    
    const storyTagsYesterday = await this.storyTagModel.countDocuments({
      storeId: sId,
      createdAt: { $gte: startOfYesterday, $lt: startOfDay }
    });

    // Calculate trends
    const calculateTrend = (today: number, yesterday: number) => {
      if (yesterday === 0) return today > 0 ? 100 : 0;
      return Math.round(((today - yesterday) / yesterday) * 100);
    };

    return {
      scansToday,
      scansTrend: calculateTrend(scansToday, scansYesterday),
      completedOrdersToday: ordersCountToday,
      ordersTrend: calculateTrend(ordersCountToday, ordersCountYesterday),
      revenueToday,
      revenueTrend: calculateTrend(revenueToday, revenueYesterday),
      storyTagsToday,
      storyTagsTrend: calculateTrend(storyTagsToday, storyTagsYesterday)
    };
  }

  @Patch('orders/:orderId/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn' })
  @ApiParam({ name: 'orderId' })
  async updateOrderStatus(@Param('orderId') orderId: string, @Body() body: UpdateOrderStatusDto) {
    const updateData: any = { status: body.status };
    if (body.note !== undefined) {
      updateData.note = body.note;
    }

    const updated = await this.orderModel.findOneAndUpdate(
      { orderId },
      updateData,
      { new: true }
    );
    if (!updated) throw new NotFoundException('Order not found');
    return { success: true, order: updated };
  }

  @Get('customers')
  @ApiOperation({ summary: 'Danh sách khách hàng' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'q', required: false })
  async getCustomers(@Query('storeId') storeId?: string, @Query('q') q?: string) {
    const query: any = { role: 'customer' };
    if (q) query.phone = new RegExp(q, 'i');
    const items = await this.userModel.find(query).exec();
    return { items };
  }

  @Get('tables')
  @ApiOperation({ summary: 'Danh sách bàn' })
  async getTables(@Query('storeId') storeId?: string, @Query('q') q?: string) {
    return { items: [] };
  }

  @Get('reports/daily')
  @ApiOperation({ summary: 'Báo cáo ngày' })
  async getDailyReport(@Query('storeId') storeId?: string, @Query('date_from') dateFrom?: string, @Query('date_to') dateTo?: string) {
    return { data: {} };
  }

  @Get('menu/items')
  @ApiOperation({ summary: 'Danh sách menu item' })
  async getMenuItems(@Query('storeId') storeId?: string, @Query('includeInactive') includeInactive?: string, @Query('q') q?: string) {
    const query: any = {};
    if (storeId) query.storeId = storeId;
    if (includeInactive !== 'true' && includeInactive !== '1') query.isActive = true;
    if (q) query['name.vi-VN'] = new RegExp(q, 'i');
    const items = await this.menuItemModel.find(query).exec();
    return { items };
  }

  @Post('menu/items')
  @ApiOperation({ summary: 'Tạo món mới' })
  async createMenuItem(@Body() body: CreateMenuItemDto) {
    try {
      const { description, imageUrl, ...rest } = body as any;
      const created = await this.menuItemModel.create({ ...rest, desc: description, image: imageUrl });
      return { success: true, item: created };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Patch('menu/items/:itemId')
  @ApiOperation({ summary: 'Cập nhật món' })
  async updateMenuItem(@Param('itemId') itemId: string, @Body() body: any) {
    const updated = await this.menuItemModel.findByIdAndUpdate(itemId, body, { new: true });
    if (!updated) throw new NotFoundException('Item not found');
    return { success: true, item: updated };
  }

  @Patch('menu/items/:itemId/toggle-active')
  @ApiOperation({ summary: 'Bật/tắt món' })
  async toggleMenuItem(@Param('itemId') itemId: string, @Body() body: ToggleActiveDto) {
    const updated = await this.menuItemModel.findByIdAndUpdate(itemId, { isActive: body.isActive }, { new: true });
    if (!updated) throw new NotFoundException('Item not found');
    return { success: true, item: updated };
  }

  @Post('menu/items/:itemId/delete')
  @ApiOperation({ summary: 'Xoá món' })
  async deleteMenuItem(@Param('itemId') itemId: string) {
    const deleted = await this.menuItemModel.findByIdAndDelete(itemId);
    if (!deleted) throw new NotFoundException('Item not found');
    return { success: true };
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Tổng quan dashboard' })
  async getDashboardSummary(@Query('storeId') storeId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    const query: any = {};
    if (storeId) query.storeId = storeId;
    const totalOrders = await this.orderModel.countDocuments(query);
    
    return { 
      summary: [
        { label: 'Lượt quét hôm nay', value: '147', trend: '+23%', color: 'var(--peach)', trendColor: '#E67E22' },
        { label: 'Đơn đã chốt', value: totalOrders.toString(), trend: '+12%', color: 'var(--mint)', trendColor: '#27AE60' },
        { label: 'Doanh thu', value: '3.8M', trend: '+18%', color: 'var(--lavn)', trendColor: '#8E44AD' },
        { label: 'Story tag IG', value: '24', trend: 'viral nhẹ', color: 'var(--hot)', trendColor: '#fff', textColor: '#fff' },
      ]
    };
  }

  @Get('offers')
  @ApiOperation({ summary: 'Danh sách offers' })
  async getOffers(@Query('storeId') storeId?: string, @Query('q') q?: string, @Query('isActive') isActive?: string) {
    return { items: [] };
  }

  @Post('offers')
  @ApiOperation({ summary: 'Tạo offer' })
  async createOffer(@Body() body: any) {
    return { success: true };
  }

  @Patch('offers/:offerId')
  @ApiOperation({ summary: 'Cập nhật offer' })
  async updateOffer(@Param('offerId') offerId: string, @Body() body: any) {
    return { success: true };
  }

  @Patch('offers/:offerId/toggle-active')
  @ApiOperation({ summary: 'Bật/tắt offer' })
  async toggleOffer(@Param('offerId') offerId: string, @Body() body: ToggleActiveDto) {
    return { success: true };
  }

  @Get('vouchers')
  @ApiOperation({ summary: 'Danh sách vouchers' })
  async getVouchers(@Query('storeId') storeId?: string) {
    const items = await this.voucherModel.find().sort({ createdAt: -1 });
    return { items };
  }

  @Post('vouchers')
  @ApiOperation({ summary: 'Tạo voucher' })
  async createVoucher(@Body() body: any) {
    const voucher = new this.voucherModel(body);
    await voucher.save();
    return { success: true, item: voucher };
  }

  @Patch('vouchers/:voucherId')
  @ApiOperation({ summary: 'Cập nhật voucher' })
  async updateVoucher(@Param('voucherId') voucherId: string, @Body() body: any) {
    const item = await this.voucherModel.findByIdAndUpdate(voucherId, body, { new: true });
    return { success: true, item };
  }

  @Patch('vouchers/:voucherId/toggle-active')
  @ApiOperation({ summary: 'Bật/tắt voucher' })
  async toggleVoucher(@Param('voucherId') voucherId: string, @Body() body: ToggleActiveDto) {
    const item = await this.voucherModel.findByIdAndUpdate(voucherId, { isActive: body.isActive }, { new: true });
    return { success: true, item };
  }

  @Get('theme-config')
  @ApiOperation({ summary: 'Lấy theme config' })
  async getThemeConfig(@Query('storeId') storeId?: string) {
    return { config: {} };
  }

  @Put('theme-config')
  @ApiOperation({ summary: 'Cập nhật theme config' })
  async updateThemeConfig(@Body() body: any) {
    return { success: true };
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Danh sách tồn kho (v1)' })
  async getInventoryV1(@Query('storeId') storeId?: string) {
    return { items: [] };
  }

  @Post('inventory')
  @ApiOperation({ summary: 'Tạo tồn kho (v1)' })
  async createInventoryV1(@Body() body: any) {
    return { success: true };
  }

  @Patch('inventory/:inventoryId')
  @ApiOperation({ summary: 'Cập nhật tồn kho (v1)' })
  async updateInventoryV1(@Param('inventoryId') inventoryId: string, @Body() body: any) {
    return { success: true };
  }

  @Get('inventory/items')
  @ApiOperation({ summary: 'Danh sách tồn kho (v2)' })
  async getInventoryV2(@Query('storeId') storeId?: string) {
    return { items: [] };
  }

  @Post('inventory/items')
  @ApiOperation({ summary: 'Tạo tồn kho (v2)' })
  async createInventoryV2(@Body() body: any) {
    return { success: true };
  }

  @Patch('inventory/items/:itemId')
  @ApiOperation({ summary: 'Cập nhật tồn kho (v2)' })
  async updateInventoryV2(@Param('itemId') itemId: string, @Body() body: any) {
    return { success: true };
  }

  @Post('inventory/adjustments')
  @ApiOperation({ summary: 'Điều chỉnh tồn kho' })
  async adjustInventory(@Body() body: any) {
    return { success: true };
  }

  @Post('inventory/receipts')
  @ApiOperation({ summary: 'Nhập kho' })
  async createReceipt(@Body() body: any) {
    return { success: true };
  }

  @Get('staff/shifts')
  @ApiOperation({ summary: 'Danh sách ca làm' })
  async getShifts(@Query('storeId') storeId?: string) {
    return { items: [] };
  }

  @Post('staff/shifts')
  @ApiOperation({ summary: 'Tạo ca làm' })
  async createShift(@Body() body: any) {
    return { success: true };
  }

  @Patch('staff/shifts/:shiftId')
  @ApiOperation({ summary: 'Cập nhật ca làm' })
  async updateShift(@Param('shiftId') shiftId: string, @Body() body: any) {
    return { success: true };
  }

  @Post('staff/shifts/:shiftId/review')
  @ApiOperation({ summary: 'Review ca làm' })
  async reviewShift(@Param('shiftId') shiftId: string, @Body() body: any) {
    return { success: true };
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Danh sách hoàn tiền' })
  async getRefunds(@Query('storeId') storeId?: string) {
    return { items: [] };
  }

  @Post('refunds')
  @ApiOperation({ summary: 'Tạo yêu cầu hoàn tiền' })
  async createRefund(@Body() body: any) {
    return { success: true };
  }

  @Patch('refunds/:refundId')
  @ApiOperation({ summary: 'Cập nhật refund' })
  async updateRefund(@Param('refundId') refundId: string, @Body() body: any) {
    return { success: true };
  }

  @Post('refunds/:refundId/review')
  @ApiOperation({ summary: 'Review refund' })
  async reviewRefund(@Param('refundId') refundId: string, @Body() body: any) {
    return { success: true };
  }

  @Post('einvoices/issue')
  @ApiOperation({ summary: 'Phát hành hóa đơn điện tử' })
  async issueInvoice(@Body() body: any) {
    return { success: true };
  }

  @Get('einvoices/:invoiceId/status')
  @ApiOperation({ summary: 'Lấy trạng thái e-invoice' })
  async getInvoiceStatus(@Param('invoiceId') invoiceId: string) {
    return { status: 'issued' };
  }

  @Post('einvoices/:invoiceId/cancel')
  @ApiOperation({ summary: 'Hủy e-invoice' })
  async cancelInvoice(@Param('invoiceId') invoiceId: string, @Body() body: any) {
    return { success: true };
  }

  @Get('sla-alerts')
  @ApiOperation({ summary: 'Danh sách cảnh báo SLA' })
  async getSlaAlerts(@Query('storeId') storeId?: string) {
    return { items: [] };
  }

  @Post('sla-alerts/:alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge cảnh báo SLA' })
  async acknowledgeAlert(@Param('alertId') alertId: string, @Body() body: any) {
    return { success: true };
  }
}
