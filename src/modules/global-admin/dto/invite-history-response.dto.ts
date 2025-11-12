import { InviteHistoryItemDto } from './invite-history-item.dto';

export class InviteHistoryResponseDto {
  items: InviteHistoryItemDto[];
  total: number;
}
