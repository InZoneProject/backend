export class InviteHistoryItemDto {
  created_at: Date;
  expires_at: Date;
  used_at: Date;
  full_name: string;
  email: string;
  photo: string | null;
}
