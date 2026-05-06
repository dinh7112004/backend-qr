import { Controller, Get, Post, Patch, Body, Query, Param, Headers, Request, NotFoundException, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery, ApiParam, ApiResponse, ApiBody } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GetQuoteDto, CreateOrderDto, GetOrdersQueryDto, GetMenuQueryDto } from './dto/client.dto';
import { MenuItem, MenuItemDocument, Category, CategoryDocument } from '../../schemas/menu.schema';
import { Store, StoreDocument } from '../../schemas/store.schema';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Voucher, VoucherDocument } from '../../schemas/voucher.schema';
import { Scan, ScanDocument } from '../../schemas/scan.schema';
import { Review, ReviewDocument } from '../../schemas/review.schema';

@ApiTags('Client')
@Controller('client')
export class ClientController {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
    @InjectModel(Scan.name) private scanModel: Model<ScanDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  @Get('menu')
  @ApiOperation({ summary: 'Menu theo bàn' })
  async getMenu(@Query() query: GetMenuQueryDto) {
    const storeId = query.storeId || 'store-genz-01';
    const store = await this.storeModel.findOne({ storeId }).exec() || {
      id: storeId,
      name: 'Boba Babe ✨',
      address: '123 Phan Xích Long, Phú Nhuận',
      tableCode: query.tableCode || 'A12'
    };
    const categories = await this.categoryModel.find({ storeId }).exec();
    const items = await this.menuItemModel.find({ storeId, isActive: true }).exec();
    const mappedItems = items.map(item => ({ ...item.toObject(), id: item._id.toString(), category: item.categoryCode }));
    
    // Separate regular items and toppings
    const regularItems = mappedItems.filter(item => item.category !== 'topping');
    const toppings = mappedItems.filter(item => item.category === 'topping');

    return {
      store,
      categories: categories.length ? categories.map(cat => cat.toObject()) : [
        { code: 'tea', name: { 'vi-VN': 'Trà Sữa ✨', en: 'Milk Tea' } },
        { code: 'coffee', name: { 'vi-VN': 'Cafe Insta 📸', en: 'Instagram Coffee' } }
      ],
      items: regularItems,
      toppings: toppings,
      tableOptions: ['Sạch sẽ', 'Wifi mạnh', 'Nhạc chill', 'Góc sống ảo'],
    };
  }

  @Post('scan')
  @ApiOperation({ summary: 'Ghi nhận lượt quét mã QR' })
  async recordScan(@Body() body: { storeId: string; tableCode: string; deviceInfo?: string }) {
    const scan = new this.scanModel({
      storeId: body.storeId || 'store-genz-01',
      tableCode: body.tableCode || 'unknown',
      deviceInfo: body.deviceInfo || 'unknown'
    });
    await scan.save();
    return { success: true };
  }

  @Post('reviews')
  @ApiOperation({ summary: 'Gửi đánh giá' })
  async submitReview(@Body() body: { storeId: string; orderId: string; customerName?: string; rating: number; comment?: string; tags?: string[] }) {
    const review = new this.reviewModel({
      storeId: body.storeId || 'store-genz-01',
      orderId: body.orderId,
      customerName: body.customerName || 'Khách ẩn danh',
      rating: body.rating,
      comment: body.comment || '',
      tags: body.tags || []
    });
    await review.save();
    return { success: true, review };
  }

  @Get('menu/items/:itemId')
  @ApiOperation({ summary: 'Chi tiết món ăn' })
  @ApiParam({ name: 'itemId', description: 'ID của món ăn' })
  async getMenuItemDetails(@Param('itemId') itemId: string) {
    const item = await this.menuItemModel.findById(itemId).exec();
    if (!item) throw new NotFoundException('Không tìm thấy món ăn');

    const orders = await this.orderModel.find({ 'items.itemId': itemId }, { orderId: 1 }).exec();
    const orderIds = orders.map(o => o.orderId);
    
    const reviews = await this.reviewModel.find({ orderId: { $in: orderIds } }).sort({ createdAt: -1 }).exec();
    const reviewCount = reviews.length;
    const avgRating = reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 5.0;

    return { 
      ...item.toObject(), 
      reviewCount, 
      rating: Number(avgRating.toFixed(1)),
      reviews 
    };
  }

  @Get('vouchers')
  @ApiOperation({ summary: 'Danh sách voucher client' })
  async getVouchers(@Query('customerPhone') customerPhone?: string) {
    const vouchers = await this.voucherModel.find({ isActive: true }).lean().exec();
    
    let orderCount = 0;
    let usedCodes: string[] = [];
    
    if (customerPhone) {
      const identifiers = customerPhone.split(',');
      orderCount = await this.orderModel.countDocuments({ 
        customerPhone: { $in: identifiers },
        status: 'completed'
      }).exec();
      
      const user = await this.userModel.findOne({ 
        $or: [
          { phone: { $in: identifiers } },
          { _id: { $in: identifiers.filter(id => id.length === 24) } }
        ]
      }).exec();
      
      if (user) {
        usedCodes = user.usedVoucherCodes || [];
      }
    }

    const processedVouchers = vouchers.map(v => ({
      ...v,
      isUsed: usedCodes.includes(v.code),
      isLocked: (v.minOrdersRequired || 0) > orderCount,
      progress: orderCount,
      target: v.minOrdersRequired || 0
    }));

    return { items: processedVouchers };
  }

  @Get('offers')
  @ApiOperation({ summary: 'Danh sách ưu đãi active' })
  async getOffers(@Query('storeId') storeId: string) {
    return { items: [] };
  }

  @Get('content')
  @ApiOperation({ summary: 'Nội dung trang chủ client' })
  async getContent(@Query('storeId') storeId: string) {
    return {
      hero: {
        title: 'Boba Babe ✨',
        sub: 'Thế giới trà sữa Gen Z cực chất! 🥤',
      },
      modules: []
    };
  }

  @Get('modules')
  @ApiOperation({ summary: 'Modules client' })
  async getModules(@Query('storeId') storeId: string) {
    return { items: [] };
  }

  @Get('home-modules')
  @ApiOperation({ summary: 'Home modules' })
  async getHomeModules(@Query('storeId') storeId: string) {
    return { items: [] };
  }

  @Get('loyalty/modules')
  @ApiOperation({ summary: 'Modules loyalty' })
  async getLoyaltyModules() {
    return { items: [] };
  }

  @Get('loyalty/catalog')
  @ApiOperation({ summary: 'Catalog loyalty' })
  async getLoyaltyCatalog() {
    return { items: [] };
  }

  @Post('cart/quote')
  @HttpCode(200)
  @ApiOperation({ summary: 'Tính quote giỏ hàng' })
  async getQuote(@Body() body: GetQuoteDto) {
    const itemIds = body.items.map(i => i.itemId);
    const toppingIds = body.items.flatMap(i => i.toppings || []);
    const allIds = [...new Set([...itemIds, ...toppingIds])];
    const products = await this.menuItemModel.find({ _id: { $in: allIds } }).exec();
    
    let subtotal = 0;
    body.items.forEach(item => {
      const product = products.find(p => p._id.toString() === item.itemId);
      if (product) {
        let unitPrice = product.price || 0;
        if (item.size === 'x') unitPrice += 10000;
        
        if (item.toppings) {
          item.toppings.forEach(tId => {
            const topping = products.find(p => p._id.toString() === tId);
            if (topping) unitPrice += topping.price || 0;
          });
        }
        subtotal += unitPrice * item.quantity;
      }
    });

    let discount = 0;
    if (body.voucherCode) {
      const voucher = await this.voucherModel.findOne({ code: body.voucherCode, isActive: true });
      if (voucher && subtotal >= (voucher.minOrderValue || 0)) {
        if (voucher.discountType === 'percentage') {
          discount = Math.round(subtotal * (voucher.discountValue / 100));
        } else {
          discount = voucher.discountValue;
        }
      }
    }

    const serviceFee = Math.round((subtotal - discount) * 0.05);
    const total = subtotal - discount + serviceFee;

    return { subtotal, serviceFee, discount, total };
  }

  @Post('orders')
  @ApiOperation({ summary: 'Tạo đơn hàng client' })
  async createOrder(@Body() body: CreateOrderDto) {
    const itemIds = body.items.map(i => i.itemId);
    const toppingIds = body.items.flatMap(i => i.toppings || []);
    const allIds = [...new Set([...itemIds, ...toppingIds])];
    const products = await this.menuItemModel.find({ _id: { $in: allIds } }).exec();
    
    let subtotal = 0;
    const orderItems = body.items.map(item => {
      const product = products.find(p => p._id.toString() === item.itemId);
      if (product) {
        let unitPrice = product.price || 0;
        if (item.size === 'x') unitPrice += 10000;
        
        const chosenToppings: string[] = [];
        if (item.toppings) {
          item.toppings.forEach(tId => {
            const topping = products.find(p => p._id.toString() === tId);
            if (topping) {
              unitPrice += topping.price || 0;
              const toppingName = typeof topping.name === 'string' 
                ? topping.name 
                : (topping.name as any)?.['vi-VN'] || 'Topping';
              chosenToppings.push(toppingName);
            }
          });
        }

        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;
        const productName = typeof product.name === 'string'
          ? product.name
          : (product.name as any)?.['vi-VN'] || 'Món ngon';
        
        return {
          itemId: item.itemId,
          name: productName,
          unitPrice,
          quantity: item.quantity,
          lineTotal: itemTotal,
          size: item.size,
          toppings: chosenToppings,
          image: product.image
        };
      }
      return null;
    }).filter((item): item is any => item !== null);

    let discount = 0;
    if (body.voucherCode) {
      const voucher = await this.voucherModel.findOne({ code: body.voucherCode, isActive: true });
      if (voucher && subtotal >= (voucher.minOrderValue || 0)) {
        // Check milestone
        const identifiers = [body.customerPhone].filter((id): id is string => !!id);
        const orderCount = await this.orderModel.countDocuments({ 
          customerPhone: { $in: identifiers },
          status: 'completed'
        }).exec();

        const orConditions: any[] = [];
        if (body.customerPhone) {
          orConditions.push({ phone: body.customerPhone });
          if (body.customerPhone.length === 24) {
            orConditions.push({ _id: body.customerPhone });
          }
        }

        const user = orConditions.length > 0 
          ? await this.userModel.findOne({ $or: orConditions }).exec()
          : null;

        const usedCodes = user?.usedVoucherCodes || [];
        const isLocked = (voucher.minOrdersRequired || 0) > orderCount;
        const isUsed = usedCodes.includes(body.voucherCode);

        if (!isLocked && !isUsed) {
          if (voucher.discountType === 'percentage') {
            discount = Math.round(subtotal * (voucher.discountValue / 100));
          } else {
            discount = voucher.discountValue;
          }
          
          if (discount > 0) {
            voucher.usageCount = (voucher.usageCount || 0) + 1;
            await voucher.save();

            if (user) {
              user.usedVoucherCodes = [...usedCodes, body.voucherCode];
              await user.save();
            }
          }
        }
      }
    }

    const serviceFee = Math.round((subtotal - discount) * 0.05);
    const total = subtotal - discount + serviceFee;
    const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    const order = await this.orderModel.create({
      orderId,
      storeId: body.storeId || 'store-genz-01',
      tableCode: body.tableCode || 'A12',
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      items: orderItems,
      subtotal,
      discount,
      serviceFee,
      total,
      note: body.note,
      status: 'pending'
    });

    return { success: true, orderId: order.orderId, order };
  }

  @Get('orders')
  @ApiOperation({ summary: 'Danh sách đơn hàng client' })
  async getOrders(@Query() query: GetOrdersQueryDto) {
    if (!query.customerPhone) {
      return { items: [] };
    }
    const identifiers = query.customerPhone.split(',');
    const orders = await this.orderModel.find({ customerPhone: { $in: identifiers } }).sort({ createdAt: -1 }).lean().exec();
    
    // Fetch reviews for these orders
    const orderIds = orders.map(o => o.orderId);
    const reviews = await this.reviewModel.find({ orderId: { $in: orderIds } }).exec();
    const reviewedOrderIds = new Set(reviews.map(r => r.orderId));

    const enrichedOrders = orders.map(o => ({
      ...o,
      isReviewed: reviewedOrderIds.has(o.orderId)
    }));

    return { items: enrichedOrders };
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Chi tiết order client' })
  async getOrderDetails(@Param('orderId') orderId: string) {
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return { additionalProp1: order };
  }

  @Get('orders/:orderId/tracking')
  @ApiOperation({ summary: 'Tracking order' })
  async getOrderTracking(@Param('orderId') orderId: string) {
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    
    // Simulate some tracking events for the demo
    const events = [
      { status: 'pending', time: order['createdAt'], title: 'Đã nhận đơn' },
    ];
    if (order.status !== 'pending') {
      events.push({ status: 'confirmed', time: new Date(), title: 'Quán đã xác nhận' });
    }
    
    return { 
      additionalProp1: {
        orderId: order.orderId,
        status: order.status,
        events
      }
    };
  }

  @Patch('orders/:orderId/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng (Dành cho khách)' })
  async updateOrderStatus(@Param('orderId') orderId: string, @Body() body: { status: string }) {
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    
    // Only allow specific status changes from client
    if (body.status === 'checking_out' || body.status === 'cancelled') {
      order.status = body.status;
      await order.save();
      return { success: true, order };
    }
    
    throw new Error('Bạn không có quyền chuyển sang trạng thái này');
  }

  @Post('payments/intents')
  @ApiOperation({ summary: 'Tạo payment intent' })
  async createPaymentIntent(@Body() body: any) {
    return { paymentId: 'pay-123', clientSecret: 'secret' };
  }

  @Post('payments/:paymentId/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xác nhận thanh toán' })
  async confirmPayment(@Param('paymentId') paymentId: string, @Body() body: any) {
    return { success: true };
  }

  @Get('loyalty/history')
  @ApiOperation({ summary: 'Lịch sử loyalty' })
  async getLoyaltyHistory() {
    return { items: [] };
  }

  @Get('loyalty/activity')
  @ApiOperation({ summary: 'Activity loyalty' })
  async getLoyaltyActivity() {
    return { items: [] };
  }

  @Post('loyalty/redeem')
  @ApiOperation({ summary: 'Đổi quà loyalty' })
  async redeemLoyalty(@Body() body: any) {
    return { success: true };
  }

  @Post('loyalty/missions/:missionId/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Hoàn thành mission' })
  async completeMission(@Param('missionId') missionId: string) {
    return { success: true, pointsEarned: 100 };
  }

  @Post('loyalty/checkin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check-in loyalty hằng ngày' })
  async checkinLoyalty() {
    return { success: true, pointsEarned: 10 };
  }

  @Post('loyalty/lucky-box/open')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mở lucky box' })
  async openLuckyBox() {
    return { success: true, reward: 'Voucher 10%' };
  }

  @Post('loyalty/mini-games/play')
  @HttpCode(200)
  @ApiOperation({ summary: 'Chơi mini game' })
  async playMiniGame(@Body() body: any) {
    return { success: true, score: 100 };
  }

  @Post('loyalty/membership/subscribe')
  @ApiOperation({ summary: 'Đăng ký gói membership' })
  async subscribeMembership(@Body() body: any) {
    return { success: true, expireAt: new Date() };
  }
}


