export class OrganizationItemDto {
  organization_id: number;
  title: string;
  description: string | null;
  work_day_start_time: string;
  work_day_end_time: string;
  created_at: Date;
}
