import { Injectable, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat } from '../../schemas/chat.schema';
import { AiInsight } from '../../schemas/ai-insight.schema';
import { BotLog } from '../../schemas/bot-log.schema';

@Injectable()
export class AiService implements OnModuleInit {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    @InjectModel('Chat') private chatModel: Model<Chat>,
    @InjectModel('AiInsight') private insightModel: Model<AiInsight>,
    @InjectModel('BotLog') private logModel: Model<BotLog>,
    @InjectModel('MenuItem') private menuItemModel: Model<any>,
    @InjectModel('Order') private orderModel: Model<any>,
    @InjectModel('Review') private reviewModel: Model<any>,
  ) { }

  onModuleInit() {
    setTimeout(async () => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        console.log('[AI] API Key found, initializing Gemini...');
        try {
          this.genAI = new GoogleGenerativeAI(apiKey);
          
          // Debug: List available models to see what this API key can access
          try {
            const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await result.json();
            const models = data.models?.map((m: any) => m.name.replace('models/', '')) || [];
            console.log('[AI] Available models for this key:', models.join(', '));
          } catch (e) {
            console.log('[AI] Could not list models, continuing with default...');
          }

          this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          console.log('Gemini AI CEO Mode initialized 🚀 (Model: gemini-2.0-flash)');
        } catch (err) {
          console.error('[AI] Initialization Failed:', err);
        }
      } else {
        console.error('[AI] CRITICAL: GEMINI_API_KEY not found in process.env!');
      }

      /* 
      setInterval(() => {
        this.runAnalysis();
      }, 86400000); 
      */

      try {
        await new this.logModel({ text: 'Hệ thống AI CEO Mode đã sẵn sàng và đang cập nhật dữ liệu mới...', type: 'info' }).save();
        this.runAnalysis();
      } catch (err) {
        console.error('Startup Error:', err);
      }
    }, 1000);
  }

  async processUserMessage(senderId: string, message: string) {
    await new this.chatModel({ senderId, role: 'user', content: message }).save();
    const history = await this.chatModel.find({ senderId }).sort({ createdAt: -1 }).limit(10).lean();
    const reply = await this.getAiReply(message, history);
    await new this.chatModel({ senderId, role: 'model', content: reply }).save();
    await new this.logModel({ text: `Bot: Phản hồi khách "${message.substring(0, 20)}..."`, type: 'info' }).save();
    return reply;
  }

  private async getAiReply(message: string, history: any[]) {
    console.log(`[AI] Processing message from ${history[0]?.senderId || 'unknown'}: "${message}"`);
    if (this.model) {
      try {
        const menuItems = await this.menuItemModel.find({ isActive: true }).lean();
        const menuContext = menuItems.map(item => {
          const name = typeof item.name === 'string' ? item.name : (item.name as any)?.['vi-VN'] || 'Món ngon';
          return `- ID: ${item._id} | Tên: ${name} | Giá: ${item.price.toLocaleString()}đ | Loại: ${item.categoryCode}`;
        }).join('\n');
        
        const senderId = history[0]?.senderId;
        const recentOrders = senderId ? await this.orderModel.find({
          $or: [{ customerPhone: senderId }, { customerName: senderId }, { tableCode: senderId }]
        }).sort({ createdAt: -1 }).limit(3).lean() : [];

        const orderContext = recentOrders.length > 0
          ? `Khách đã từng mua: ${recentOrders.map(o => o.items.map(i => i.name).join(', ')).join('; ')}`
          : 'Khách hàng mới.';

        // Lấy danh sách món bán chạy thực tế từ database (ví dụ 5 món top)
        const allOrders = await this.orderModel.find({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }).lean();
        const salesMap: Record<string, number> = {};
        allOrders.forEach(o => o.items.forEach((i: any) => salesMap[i.name] = (salesMap[i.name] || 0) + i.quantity));
        const topSelling = Object.entries(salesMap).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name]) => name).join(', ');

        const prompt = `Bạn là "Boba Bot" - trợ lý ảo Gen Z cực kỳ đáng yêu của Boba Babe ✨🧋.
        
THỰC ĐƠN CỦA QUÁN (Tên | Giá | ID):
${menuContext}

THÔNG TIN QUAN TRỌNG:
- Món bán chạy nhất (Best Sellers): ${topSelling || 'Trà sữa nướng dừa, Trà ô long kem cheese'}.
- Bí mật của quán: Công thức trà ủ lạnh 12 tiếng và trân chân thủ công làm mới mỗi giờ. Nếu khách hỏi bí mật, hãy trả lời khéo léo, duyên dáng, không tiết lộ chi tiết kỹ thuật nhưng vẫn làm khách tò mò.

QUY TẮC PHẢN HỒI:
1. GIÁ CẢ: Nếu khách hỏi giá, hãy nhìn vào Thực đơn trên và trả lời chính xác số tiền. 
2. GỢI Ý: Luôn ưu tiên gợi ý các món trong danh sách "Món bán chạy nhất" nếu khách hỏi quán có gì ngon.
3. MÓN NGOÀI THỰC ĐƠN: Nếu khách hỏi những món không có (Vd: thịt gà, cơm, phở...), hãy trả lời khéo léo rằng quán chuyên về trà sữa và đồ uống giải nhiệt nên chưa có món đó, sau đó gợi ý khách thử một món trà sữa đang hot của quán để thay thế.
4. KÝ TỰ: KHÔNG dùng các ký tự định dạng như * hoặc #. Chỉ dùng chữ thường và emoji.
5. MÃ GỢI Ý: Luôn thêm [SUGGEST: itemId] ở cuối nếu nhắc đến món ăn.

Ví dụ khách hỏi: "Bí mật của quán là gì?"
Trả lời: "Hì hì, bí mật nằm ở những hạt trân châu được nhào nặn thủ công mỗi giờ đó nha! 🥰 Cậu thử một ly Trà sữa nướng dừa để cảm nhận sự khác biệt đi nè! ✨🧋 [SUGGEST: id_trà_sữa]"

LỊCH SỬ CHAT: ${history.slice(0, 5).map(h => `${h.role}: ${h.content}`).join(' | ')}
CÂU HỎI MỚI NHẤT CỦA KHÁCH: "${message}"`;

        console.log(`[AI] Generating with gemini-2.0-flash...`);
        try {
          const result = await this.model.generateContent(prompt);
          let reply = result.response.text().trim();
          
          // Remove all markdown formatting characters
          reply = reply.replace(/[*#]/g, '');
          
          return reply;
        } catch (innerErr: any) {
          console.warn(`[AI] Primary attempt failed (${innerErr.message}), retrying with flash...`);
          const fallbackModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          const result = await fallbackModel.generateContent(prompt);
          return result.response.text().trim().replace(/[*#]/g, '');
        }
      } catch (err: any) {
        console.error('[AI] Gemini Generation Error:', err.message || err);
        if (err.message?.includes('429')) {
          return "Tớ đang bị quá tải tin nhắn một chút, bạn đợi tớ 30 giây rồi nhắn lại nhé! ✨🧋";
        }
      }
    } else {
      console.error('[AI] Error: Model not initialized.');
    }
    return "Hic, tớ đang bị lạc một chút. Bạn đợi tớ vài giây rồi hỏi lại nhé! 🧋✨";
  }

  async getDashboardData() {
    const insights = await this.insightModel.find().sort({ createdAt: -1 }).limit(6);
    const logs = await this.logModel.find().sort({ createdAt: -1 }).limit(15);
    return { insights, logs };
  }

  async runAnalysis() {
    if (!this.model) return;

    try {
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prev7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const [ordersCurrent, ordersPrev, chats, reviews, menuItems] = await Promise.all([
        this.orderModel.find({ createdAt: { $gte: last7Days } }).limit(20).lean(),
        this.orderModel.find({ createdAt: { $gte: prev7Days, $lt: last7Days } }).limit(20).lean(),
        this.chatModel.find({ role: 'user', createdAt: { $gte: last7Days } }).sort({ createdAt: -1 }).limit(20).lean(),
        this.reviewModel.find().sort({ createdAt: -1 }).limit(5).lean(),
        this.menuItemModel.find().lean()
      ]);

      const calculateStats = (orders: any[]) => {
        let revenue = 0;
        const items: Record<string, number> = {};
        orders.forEach(o => {
          revenue += o.total;
          o.items.forEach(i => { items[i.name] = (items[i.name] || 0) + i.quantity; });
        });
        return { revenue, items };
      };

      const statsCurrent = calculateStats(ordersCurrent);
      const statsPrev = calculateStats(ordersPrev);
      const growth = statsPrev.revenue ? Math.round(((statsCurrent.revenue - statsPrev.revenue) / statsPrev.revenue) * 100) : 12;
      const topItems = Object.entries(statsCurrent.items).sort(([, a], [, b]) => b - a).slice(0, 3);

      // New: Analyze customer sentiment and requests from chats
      const chatSummary = chats.length > 0 
        ? chats.map(c => c.content).join(' | ').substring(0, 1000)
        : "Chưa có dữ liệu hội thoại mới.";

      const prompt = `BẠN LÀ SIÊU CỐ VẤN CHIẾN LƯỢC KINH DOANH CHO TIỆM TRÀ SỮA BOBA BABE.
DỮ LIỆU THỰC TẾ TRONG 7 NGÀY QUA:
- Doanh thu: ${statsCurrent.revenue.toLocaleString()}đ (Tăng trưởng: ${growth}%)
- Món bán chạy: ${topItems.map(([name, count]) => `${name} (${count})`).join(', ')}
- Đánh giá: ${reviews.slice(0, 3).map(r => r.comment).join(' | ')}
- NỘI DUNG KHÁCH CHAT VỚI BOT: ${chatSummary}

NHIỆM VỤ CỦA BẠN:
1. Phân tích nội dung chat để tìm ra món khách đang quan tâm nhất.
2. Tạo ra ĐÚNG 6 Insight chiến lược. BẮT BUỘC phải có 1 mục với "category": "product" để gợi ý món mới dựa trên nội dung chat.
3. Các mục còn lại là: revenue, space, tech, model, sustainability.

ĐỊNH DẠNG JSON TRẢ VỀ (Mảng đúng 6 đối tượng):
[
  { "category": "product", "title": "Gợi ý món mới", "content": "Bestie ơi, khách đang hỏi về... nên mình add món... nha!", "suggestion": "Tên món gợi ý", "type": "trend_up", "actionText": "Tạo món" },
  { "category": "revenue", ... },
  ...
]
Yêu cầu: Viết category ĐÚNG CHỮ THƯỜNG. Ngôn ngữ Gen Z thân thiện.`;

      let insights: any[] = [];
      if (this.model) {
        try {
          const result = await this.model.generateContent(prompt);
          const text = result.response.text();
          console.log('[AI CEO] Raw response length:', text.length);
          
          // Improved JSON extraction
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            let rawJson = jsonMatch[0].replace(/```json|```/g, '').trim();
            try {
              insights = JSON.parse(rawJson);
            } catch (parseErr) {
              console.error('[AI CEO] JSON Parse failed, attempting cleanup...');
              // Fallback: try to fix common AI JSON errors
              rawJson = rawJson.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
              insights = JSON.parse(rawJson);
            }
          } else {
             await new this.logModel({ text: `AI thất bại: Không tìm thấy định dạng mảng JSON trong phản hồi.`, type: 'warning' }).save();
          }
        } catch (err: any) {
          console.error('Gemini CEO Multi-Insight Error:', err);
          const isQuotaError = err.message?.includes('429') || err.message?.includes('quota');
          const friendlyMsg = isQuotaError 
            ? 'AI đã dùng hết lượt phân tích miễn phí hôm nay. Sếp vui lòng quay lại sau nha! ✨' 
            : `AI Gặp sự cố: ${err.message}`;
          await new this.logModel({ text: friendlyMsg, type: isQuotaError ? 'info' : 'error' }).save();
        }
      }

      if (insights.length > 0) {
        // Ensure every insight has the required fields from our updated schema
        const validInsights = insights.map(ins => ({
          title: ins.title || 'Thông tin từ AI',
          content: ins.content || 'Đang cập nhật...',
          category: ins.category || 'general',
          suggestion: ins.suggestion || '',
          actionText: ins.actionText || 'Xem thêm',
          type: ins.type || 'info'
        }));

        await this.insightModel.deleteMany({});
        for (const ins of validInsights) {
          await new this.insightModel(ins).save();
        }
        await new this.logModel({ 
          text: `AI CEO Mode: Cập nhật thành công ${validInsights.length} bản tin chiến lược lúc ${new Date().toLocaleTimeString('vi-VN')}.`, 
          type: 'success' 
        }).save();
      }
    } catch (err) {
      console.error('CEO Analysis Error:', err);
    }
  }
}