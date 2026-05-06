import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  size?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  toppings?: string[];
}

export class GetMenuQueryDto {
  @ApiProperty({ description: 'ID cửa hàng' })
  @IsString()
  storeId: string;

  @ApiProperty({ description: 'Mã bàn' })
  @IsString()
  tableCode: string;
}

export class GetQuoteDto {
  @ApiProperty()
  @IsString()
  storeId: string;

  @ApiProperty({ type: [CartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  voucherCode?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  memberDiscountRate?: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  storeId: string;

  @ApiProperty()
  @IsString()
  tableCode: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  voucherCode?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  memberDiscountRate?: number;

  @ApiProperty({ type: [CartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}

export class GetOrdersQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tableCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerPhone?: string;
}
