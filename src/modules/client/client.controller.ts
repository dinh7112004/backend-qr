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
import * as crypto from 'crypto';

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
    @InjectModel('Table') private tableModel: Model<any>,
  ) {}

  private calculatePayOSSignature(data: any, checksumKey: string): string {
    const sortedKeys = Object.keys(data).sort();
    const queryString = sortedKeys
      .map(key => `${key}=${data[key]}`)
      .join('&');
    
    return crypto
      .createHmac('sha256', checksumKey)
      .update(queryString)
      .digest('hex');
  }

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

    // Lấy thông tin bàn thực tế
    const tableInfo = await this.tableModel.findOne({ storeId, code: query.tableCode }).exec();

    const categories = await this.categoryModel.find({ storeId }).exec();
    const items = await this.menuItemModel.find({ storeId, isActive: true }).exec();
    const mappedItems = items.map(item => ({ 
      ...item.toObject(), 
      id: item._id.toString(), 
      category: item.categoryCode,
      availableToppings: item.availableToppings || []
    }));
    const toppings = mappedItems.filter(item => item.category === 'topping');

    const defaultCategories = [
      { code: 'tea', name: { 'vi-VN': 'Trà Sữa ✨', en: 'Milk Tea' } },
      { code: 'coffee', name: { 'vi-VN': 'Cafe Insta 📸', en: 'Instagram Coffee' } },
      { code: 'food', name: { 'vi-VN': 'Món Ăn Vặt 🍟', en: 'Snacks' } },
      { code: 'topping', name: { 'vi-VN': 'Topping 🍡', en: 'Toppings' } }
    ];

    const defaultItems = [
      { 
        id: 'item-01', 
        name: { 'vi-VN': 'Trà Sữa Nướng Dừa ✨', en: 'Roasted Coconut Milk Tea' },
        price: 45000, 
        category: 'tea',
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500',
        tags: ['HOT', 'NEW'],
        desc: { 'vi-VN': 'Vị trà nướng thơm lừng kết hợp cốt dừa béo ngậy cực phẩm!', en: 'Roasted tea with creamy coconut milk.' }
      },
      { 
        id: 'item-02', 
        name: { 'vi-VN': 'Cafe Muối Biển 📸', en: 'Sea Salt Coffee' },
        price: 35000, 
        category: 'coffee',
        image: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=500',
        tags: ['BEST SELLER'],
        desc: { 'vi-VN': 'Vị đắng của cafe hòa quyện cùng lớp kem muối mặn mặn béo béo.', en: 'Bitter coffee with salty cream foam.' }
      },
      { 
        id: 'item-03', 
        name: { 'vi-VN': 'Khoai Tây Chiên Phô Mai 🍟', en: 'Cheese Fries' },
        price: 39000, 
        category: 'food',
        image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=500',
        tags: ['CRUNCHY'],
        desc: { 'vi-VN': 'Khoai tây giòn rụm lắc đẫm bột phô mai cao cấp.', en: 'Crunchy fries with premium cheese powder.' }
      }
    ];

    const defaultToppings = [
      { id: 't-01', name: { 'vi-VN': 'Trân Châu Đen 🍡', en: 'Black Pearl' }, price: 5000, category: 'topping' },
      { id: 't-02', name: { 'vi-VN': 'Kem Cheese 🧀', en: 'Cheese Foam' }, price: 10000, category: 'topping' }
    ];

    return {
      store,
      table: tableInfo || { name: query.tableCode || 'A12' },
      categories: categories.length ? categories.map(cat => cat.toObject()) : defaultCategories,
      items: items.length ? mappedItems.filter(i => i.category !== 'topping') : defaultItems,
      toppings: toppings.length ? toppings : defaultToppings,
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
    const vouchers = await this.voucherModel.find({ isActive: true, isHidden: { $ne: true } }).lean().exec();
    
    let orderCount = 0;
    let usedCodes: string[] = [];
    let redeemedCodes: string[] = [];
    let currentPoints = 0;
    
    if (customerPhone) {
      const identifiers = customerPhone.split(',');
      orderCount = await this.orderModel.countDocuments({ 
        customerPhone: { $in: identifiers },
        status: 'completed'
      }).exec();
      
      const user = await this.userModel.findOne({ 
        $or: [
          { phone: { $in: identifiers } },
          { _id: { $in: identifiers.filter(id => /^[0-9a-fA-F]{24}$/.test(id)) } }
        ]
      }).exec();
      
      if (user) {
        usedCodes = user.usedVoucherCodes || [];
        redeemedCodes = (user as any).redeemedVoucherCodes || [];
        currentPoints = user.loyaltyPoints || 0;
      }
    }

    const processedVouchers = vouchers.map(v => {
      const pointCost = (v as any).pointCost || 0;
      const isRedeemed = redeemedCodes.includes(v.code);
      const minOrders = v.minOrdersRequired || 0;
      
      // A voucher is locked if it requires more orders than user has, 
      // OR if it has a point cost and hasn't been redeemed yet.
      const isLocked = minOrders > orderCount || (pointCost > 0 && !isRedeemed);

      return {
        ...v,
        isUsed: usedCodes.includes(v.code),
        isRedeemed,
        isLocked,
        isAffordable: currentPoints >= pointCost,
        progress: pointCost > 0 && !isRedeemed ? currentPoints : orderCount,
        target: pointCost > 0 && !isRedeemed ? pointCost : minOrders,
        type: pointCost > 0 ? 'loyalty' : 'milestone'
      };
    });

    return { items: processedVouchers, currentPoints };
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
    const toppingIds = body.items.flatMap(i => i.toppings || (i as any).selectedToppings || []);
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
        let isEligible = true;

        // Check if user identity is provided for milestone/loyalty rules
        if (voucher.minOrdersRequired > 0 || (voucher as any).pointCost > 0) {
          if (!body.customerPhone) {
            isEligible = false;
          } else {
            const identifiers = body.customerPhone.split(',');
            const orderCount = await this.orderModel.countDocuments({ 
              customerPhone: { $in: identifiers },
              status: 'completed'
            }).exec();

            const user = await this.userModel.findOne({ 
              $or: [
                { phone: { $in: identifiers } },
                { _id: { $in: identifiers.filter(id => /^[0-9a-fA-F]{24}$/.test(id)) } }
              ]
            }).exec();

            const redeemedCodes = (user as any)?.redeemedVoucherCodes || [];
            const pointCost = (voucher as any).pointCost || 0;

            // Enforce rules
            if (orderCount < voucher.minOrdersRequired) isEligible = false;
            if (pointCost > 0 && !redeemedCodes.includes(voucher.code)) isEligible = false;
          }
        }

        if (isEligible) {
          if (voucher.discountType === 'percentage') {
            discount = Math.round(subtotal * (voucher.discountValue / 100));
          } else {
            discount = voucher.discountValue;
          }
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
    const toppingIds = body.items.flatMap(i => i.toppings || (i as any).selectedToppings || []);
    const allIds = [...new Set([...itemIds, ...toppingIds])];
    const products = await this.menuItemModel.find({ _id: { $in: allIds } }).exec();
    
    let subtotal = 0;
    const orderItems = body.items.map(item => {
      const product = products.find(p => p._id.toString() === item.itemId);
      if (product) {
        let unitPrice = product.price || 0;
        if (item.size === 'x') unitPrice += 10000;
        
        const toppingList = item.toppings || item.selectedToppings || [];
        const chosenToppings: string[] = [];
        if (toppingList.length > 0) {
          toppingList.forEach((tId: string) => {
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
          if (/^[0-9a-fA-F]{24}$/.test(body.customerPhone)) {
            orConditions.push({ _id: body.customerPhone });
          }
        }

        const user = orConditions.length > 0 
          ? await this.userModel.findOne({ $or: orConditions }).exec()
          : null;

        const usedCodes = user?.usedVoucherCodes || [];
        const redeemedCodes = (user as any)?.redeemedVoucherCodes || [];
        const pointCost = (voucher as any).pointCost || 0;

        const isLocked = (voucher.minOrdersRequired || 0) > orderCount;
        const isNotRedeemed = pointCost > 0 && !redeemedCodes.includes(body.voucherCode);
        const isUsed = usedCodes.includes(body.voucherCode);

        if (!isLocked && !isNotRedeemed && !isUsed) {
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
    const orderId = 'ORD' + Math.random().toString(36).substr(2, 9).toUpperCase();

    const payosOrderCode = Date.now() % 100000000; // 8 digits

    let checkoutUrl = '';
    let qrCode = '';
    let payosError = '';
    
    try {
      const payosData = {
        orderCode: payosOrderCode,
        amount: Math.round(total),
        description: orderId,
        cancelUrl: 'https://backend-qr-h4th.onrender.com/client/cancel',
        returnUrl: 'https://backend-qr-h4th.onrender.com/client/success',
      };
      
      const signature = this.calculatePayOSSignature(payosData, '730af6bf1a721b2b9b8c45650bbd633f2d20b6d529d9ff7a0d91b1a189039078');
      
      // Sử dụng fetch native của Node (Node 18+)
      const response = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: {
          'x-client-id': 'a587c30c-28c2-4366-8b3e-37f8ee5fdb12',
          'x-api-key': '6b716a60-e99a-4432-9a0b-5722fedf7024',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...payosData, signature }),
      });
      
      const resData = await response.json() as any;
      console.log('PayOS API Response:', JSON.stringify(resData));
      
      if (resData.code === '00' && resData.data) {
        checkoutUrl = resData.data.checkoutUrl;
        qrCode = resData.data.qrCode;
      } else {
        payosError = resData.desc || 'Unknown PayOS error';
      }
    } catch (error: any) {
      console.error('Failed to call PayOS API:', error);
      payosError = error.message || 'Fetch failed';
    }

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
      status: ((body as any).paymentMethod === 'cash' || !(body as any).paymentMethod) ? 'pending' : 'pending_payment',
      paymentMethod: (body as any).paymentMethod || 'cash',
      idempotencyKey: payosOrderCode.toString(), // Dùng tạm trường này để lưu mã số đơn hàng của PayOS
      qrCode,
      checkoutUrl,
      payosError
    });

    return { success: true, orderId: order.orderId, order, checkoutUrl, qrCode };
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
  async redeemLoyalty(@Body() body: { customerPhone: string, voucherCode: string }) {
    const { customerPhone, voucherCode } = body;
    
    const user = await this.userModel.findOne({ phone: customerPhone }).exec();
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const voucher = await this.voucherModel.findOne({ code: voucherCode, isActive: true }).exec();
    if (!voucher) throw new NotFoundException('Voucher không tồn tại hoặc đã hết hạn');

    const pointCost = (voucher as any).pointCost || 0;
    if (pointCost <= 0) throw new Error('Voucher này không thể đổi bằng điểm');

    if (user.loyaltyPoints < pointCost) {
      throw new Error('Bạn không đủ điểm để đổi voucher này');
    }

    const redeemedCodes = (user as any).redeemedVoucherCodes || [];
    if (redeemedCodes.includes(voucherCode)) {
      throw new Error('Bạn đã đổi voucher này rồi');
    }

    // Deduct points and add to redeemed list
    user.loyaltyPoints -= pointCost;
    (user as any).redeemedVoucherCodes = [...redeemedCodes, voucherCode];
    await user.save();

    return { 
      success: true, 
      message: `Đổi voucher ${voucher.title} thành công!`,
      currentPoints: user.loyaltyPoints 
    };
  }

  @Post('loyalty/missions/:missionId/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Hoàn thành mission' })
  async completeMission(@Param('missionId') missionId: string) {
    return { success: true, pointsEarned: 0, message: 'Điểm sẽ được cộng khi admin xác nhận tag IG nha!' };
  }

  @Post('loyalty/checkin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check-in loyalty hằng ngày' })
  async checkinLoyalty() {
    return { success: true, pointsEarned: 0, message: 'Mua trà sữa để nhận thêm điểm nha!' };
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

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook nhận thanh toán từ PayOS/Casso' })
  async handleWebhook(@Body() body: any) {
    console.log('Received Webhook:', JSON.stringify(body));
    
    const data = body.data;
    if (!data) {
      return { error: 0, message: 'Ok' }; // Xử lý trường hợp ping hoặc data rỗng
    }
    
    // Xử lý PayOS (data là 1 object)
    if (typeof data === 'object' && !Array.isArray(data)) {
      const orderCode = data.orderCode;
      
      if (orderCode) {
        console.log(`Found Order Code from PayOS Webhook: ${orderCode}`);
        // Tìm đơn hàng bằng orderCode (đã lưu ở trường idempotencyKey)
        const order = await this.orderModel.findOne({ idempotencyKey: orderCode.toString() }).exec();
        
        if (order) {
          if (order.status !== 'completed' && order.status !== 'pending') {
            order.status = 'pending';
            (order as any).note = `Thanh toán tự động qua PayOS API`;
            await order.save();
            console.log(`Order ${order.orderId} updated to pending via orderCode.`);
            return { error: 0, message: 'Ok' };
          }
        }
      }
      
      // Fallback: Nếu không có orderCode thì tìm bằng description như cũ
      const description = data.description || '';
      const match = description.match(/ORD[A-Z0-9]+/i);
      
      if (match) {
        const orderId = match[0].toUpperCase();
        console.log(`Found Order ID from PayOS Webhook (Fallback): ${orderId}`);
        
        const order = await this.orderModel.findOne({ orderId }).exec();
        if (order) {
          if (order.status === 'pending_payment') {
            order.status = 'pending';
            (order as any).note = `Thanh toán tự động qua PayOS (Fallback)`;
            await order.save();
            console.log(`Order ${orderId} updated to pending.`);
          } else if (order.status === 'pending') {
            order.status = 'confirmed';
            (order as any).note = `Thanh toán tự động qua PayOS (Fallback)`;
            await order.save();
            console.log(`Order ${orderId} updated to confirmed.`);
          }
        }
      }
    } 
    // Xử lý Casso (data là 1 array)
    else if (Array.isArray(data)) {
      for (const tx of data) {
        const description = tx.description || '';
        const match = description.match(/ORD-[A-Z0-9]+/i);
        
        if (match) {
          const orderId = match[0].toUpperCase();
          console.log(`Found Order ID: ${orderId} from Casso`);
          
          const order = await this.orderModel.findOne({ orderId }).exec();
          if (order) {
            if (order.status !== 'completed') {
              order.status = 'completed';
              (order as any).note = `Thanh toán tự động qua Casso`;
              await order.save();
              console.log(`Order ${orderId} updated to completed.`);
            }
          }
        }
      }
    }
    
    return { error: 0, message: 'Ok' };
  }
}


