export interface NotificationPayload {
  notification_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}
