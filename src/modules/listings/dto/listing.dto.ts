import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export enum ListingIntent {
  WTS = 'WTS',
  WTB = 'WTB',
}

export enum ListingStockType {
  MASTER_CARTON       = 'MASTER_CARTON',
  LOOSE_ACTIVATED     = 'LOOSE_ACTIVATED',
  LOOSE_NON_ACTIVATED = 'LOOSE_NON_ACTIVATED',
}

export class CreateListingDto {
  @IsEnum(ListingIntent)
  intent!: ListingIntent;

  // Phone listings: variant_id resolves product/category/brand automatically
  @IsUUID()
  @IsOptional()
  variant_id?: string;

  // Laptop / accessory listings: category_slug + optional brand_name + product_name
  @IsString()
  @IsOptional()
  category_slug?: string;

  @IsString()
  @IsOptional()
  brand_name?: string;

  @IsString()
  @IsOptional()
  product_name?: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  price_per_unit?: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsEnum(ListingStockType)
  @IsOptional()
  stock_type?: ListingStockType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;
}
