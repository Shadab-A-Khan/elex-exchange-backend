import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class SendListingApprovedEmailDto {
  @IsEmail()
  to!: string;

  @IsString()
  @IsNotEmpty()
  traderName!: string;

  @IsString()
  @IsNotEmpty()
  productName!: string;

  @IsString()
  @IsNotEmpty()
  listingUrl!: string;
}
