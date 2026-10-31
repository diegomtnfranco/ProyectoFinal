import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page?: number;

  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export interface NotificationView {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationPage {
  items: NotificationView[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  unreadCount: number;
}
