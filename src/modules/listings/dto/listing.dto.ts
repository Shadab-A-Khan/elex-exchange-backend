import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export enum ListingIntent {
  WTS = 'WTS',
  WTB = 'WTB',
}

export enum ListingCondition {
  SEALED       = 'SEALED',
  NEW          = 'NEW',
  OPEN_BOX     = 'OPEN_BOX',
  REFURBISHED  = 'REFURBISHED',
}

export enum SpecRegion {
  INDIA  = 'INDIA',
  GLOBAL = 'GLOBAL',
}

export class CreateListingDto {
  @IsEnum(ListingIntent)
  intent!: ListingIntent;

  @IsString()
  @Length(1, 500)
  product_name!: string;

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

  @IsEnum(ListingCondition)
  @IsOptional()
  condition?: ListingCondition;

  @IsEnum(SpecRegion)
  @IsOptional()
  spec_region?: SpecRegion;

  @IsString()
  @IsOptional()
  description?: string;
}
