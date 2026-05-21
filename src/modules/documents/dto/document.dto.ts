import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum DocumentStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class UpdateDocumentStatusDto {
  @IsEnum(DocumentStatus)
  status!: DocumentStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
