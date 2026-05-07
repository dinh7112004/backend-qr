import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNumber, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty()
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateMenuItemDto {
  @ApiProperty()
  @IsString()
  storeId: string;

  @ApiProperty()
  @IsString()
  categoryCode: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({ type: Object })
  @IsObject()
  name: { 'vi-VN': string; en?: string };

  @ApiProperty({ type: Object })
  @IsObject()
  description: { 'vi-VN': string; en?: string };

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsString()
  imageUrl: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  tags: string[];

  @ApiProperty()
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  availableToppings?: string[];
}

export class ToggleActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
