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

  @IsUUID()
  variant_id!: string;

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
