import { IsEmail, IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class SendDocumentStatusEmailDto {
  @IsEmail()
  to!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @IsIn(['VERIFIED', 'REJECTED'])
  status!: 'VERIFIED' | 'REJECTED';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
