import { IsEmail, IsString, IsNotEmpty, IsIn } from 'class-validator';

export class SendAccountStatusEmailDto {
  @IsEmail()
  to!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}
