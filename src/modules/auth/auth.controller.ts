import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, Headers, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { LoginDto, SendOtpDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng nhập', description: 'Đăng nhập owner/merchant/customer.' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async login(@Body() body: LoginDto) {
    return {
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      user: {
        id: 'user-123',
        phone: body.phone,
        displayName: 'Demo User',
        role: 'customer',
      },
    };
  }

  @Post('otp/send')
  @HttpCode(200)
  @ApiOperation({ summary: 'Gửi OTP', description: 'Gửi OTP cho đăng ký/đăng nhập/reset password. Demo trả luôn OTP trong response.' })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async sendOtp(@Body() body: SendOtpDto) {
    // Generate a mock 6-digit OTP for demo purposes
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    return { additionalProp1: { message: 'OTP sent successfully', otp: mockOtp } };
  }

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký khách hàng', description: 'Tạo account customer mới bằng OTP.' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  async register(@Body() body: RegisterDto) {
    return { additionalProp1: { message: 'Registered successfully', user: { phone: body.phone, displayName: body.displayName } } };
  }

  @Post('password/reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đổi mật khẩu bằng OTP', description: 'Reset mật khẩu bằng OTP.' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return { additionalProp1: { message: 'Password reset successfully' } };
  }
}

@ApiTags('Auth')
@Controller('me')
export class MeController {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  private async getOrCreateUser(deviceId: string) {
    if (!deviceId) return null;
    
    // 1. Try to find by deviceId or phone atomically to handle race conditions
    let user = await this.userModel.findOne({
      $or: [
        { deviceId: deviceId },
        { phone: deviceId }
      ]
    }).exec();
    
    if (user) {
      if (!user.deviceId) {
        user.deviceId = deviceId;
        await user.save();
      }
      return user;
    }

    // 2. Atomic Upsert using findOneAndUpdate to prevent E11000 race conditions
    try {
      user = await this.userModel.findOneAndUpdate(
        { phone: deviceId },
        { 
          $setOnInsert: {
            phone: deviceId,
            deviceId: deviceId,
            displayName: 'Khách quý',
            role: 'customer',
            loyaltyPoints: 0,
            loyaltyTier: 'Newbie',
            favoriteIds: []
          }
        },
        { upsert: true, new: true }
      ).exec();
      return user;
    } catch (error) {
      // If it still fails with E11000 (rare race condition edge case), do one last find
      if (error.code === 11000) {
        return this.userModel.findOne({
          $or: [
            { deviceId: deviceId },
            { phone: deviceId }
          ]
        }).exec();
      }
      throw error;
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy profile hiện tại', description: 'Thông tin user theo bearer token.' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getMe(@Headers('x-device-id') deviceId: string) {
    const user = await this.getOrCreateUser(deviceId);
    if (!user) throw new NotFoundException('Identification required');
    return {
      additionalProp1: user.toObject()
    };
  }

  @Get('loyalty')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy loyalty của user hiện tại', description: 'Thông tin điểm/tier của customer hiện tại.' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getLoyalty(@Headers('x-device-id') deviceId: string) {
    const user = await this.getOrCreateUser(deviceId);
    return {
      additionalProp1: {
        points: user?.loyaltyPoints || 0,
        tier: user?.loyaltyTier || 'Bronze',
        nextTier: 'Silver',
        pointsToNextTier: 100,
      }
    };
  }

  @Post('favorites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle favorite item' })
  async toggleFavorite(
    @Headers('x-device-id') deviceId: string,
    @Body() body: { itemId: string }
  ) {
    const user = await this.getOrCreateUser(deviceId);
    if (!user) throw new NotFoundException('Identification required');

    const index = user.favoriteIds.indexOf(body.itemId);
    if (index > -1) {
      user.favoriteIds.splice(index, 1);
    } else {
      user.favoriteIds.push(body.itemId);
    }

    await user.save();
    return {
      additionalProp1: user.favoriteIds
    };
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất', description: 'Gỡ liên kết thiết bị hiện tại khỏi tài khoản.' })
  async logout(@Headers('x-device-id') deviceId: string) {
    if (deviceId) {
      await this.userModel.updateMany({ deviceId }, { $unset: { deviceId: 1 } }).exec();
    }
    return { additionalProp1: { message: 'Logged out successfully' } };
  }

  @Post('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật profile', description: 'Cập nhật tên, SĐT và Instagram cho thiết bị hiện tại.' })
  async updateProfile(
    @Headers('x-device-id') deviceId: string,
    @Body() body: { displayName: string; phone: string; instagramUsername?: string }
  ) {
    let currentUser = await this.getOrCreateUser(deviceId);
    if (!currentUser) throw new NotFoundException('Identification required');

    // Ensure this deviceId is not associated with anyone else before we start
    await this.userModel.updateMany(
      { deviceId, _id: { $ne: currentUser._id } }, 
      { $unset: { deviceId: 1 } }
    ).exec();

    // Check if another user already has this phone number
    let existingUser = await this.userModel.findOne({ phone: body.phone }).exec();

    if (existingUser) {
      const isSameUser = existingUser._id.toString() === currentUser._id.toString();

      // If we found an existing user with this phone, update fields
      existingUser.displayName = body.displayName;
      existingUser.deviceId = deviceId; 
      if (body.instagramUsername) {
        existingUser.instagramUsername = body.instagramUsername;
      }

      // ONLY Merge data if the guest user is DIFFERENT from the existing account
      if (!isSameUser) {
        // Merge loyalty points
        if (currentUser.loyaltyPoints > 0) {
          existingUser.loyaltyPoints += currentUser.loyaltyPoints;
        }

        // Merge favorites
        const uniqueFavorites = Array.from(new Set([...existingUser.favoriteIds, ...currentUser.favoriteIds]));
        existingUser.favoriteIds = uniqueFavorites;

        // Delete the temporary guest account
        await this.userModel.deleteOne({ _id: currentUser._id }).exec();
      }

      await existingUser.save();

      return {
        additionalProp1: existingUser.toObject()
      };
    } else {
      // No existing user with this phone, just update the current one
      currentUser.displayName = body.displayName;
      currentUser.phone = body.phone;
      if (body.instagramUsername) {
        currentUser.instagramUsername = body.instagramUsername;
      }
      await currentUser.save();

      return {
        additionalProp1: currentUser.toObject()
      };
    }
  }
}
