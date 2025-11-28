import { IsString, IsOptional } from 'class-validator';

export class EmqxAuthDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsString()
  clientid: string;
}
