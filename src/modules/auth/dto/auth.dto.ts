import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '0900111111' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'owner123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SendOtpDto {
  @ApiProperty({ example: '0900111111' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'login' })
  @IsString()
  @IsNotEmpty()
  purpose: string;
}

export class RegisterDto {
  @ApiProperty({ example: '0900111111' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Quang Dinh' })
  @IsString()
  @IsNotEmpty()
  displayName: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '0900111111' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
