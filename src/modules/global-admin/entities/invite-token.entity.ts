import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrganizationAdmin } from '../../organizations/entities/organization-admin.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { TagAdmin } from '../../tag-admin/entities/tag-admin.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { InviteTokenType } from '../enums/invite-token-type.enum';

@Entity()
export class InviteToken {
  @PrimaryGeneratedColumn()
  invite_token_id: number;

  @Column({ type: 'text', unique: true })
  token_encrypted: string;

  @Column({
    type: 'enum',
    enum: InviteTokenType,
  })
  invite_type: InviteTokenType;

  @Column({ default: false })
  is_used: boolean;

  @Column({ type: 'timestamp', nullable: true })
  used_at: Date;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @ManyToOne(() => OrganizationAdmin, { nullable: true })
  @JoinColumn({ name: 'used_by_organization_admin_id' })
  used_by_organization_admin: OrganizationAdmin | null;

  @ManyToOne(() => TagAdmin, { nullable: true })
  @JoinColumn({ name: 'used_by_tag_admin_id' })
  used_by_tag_admin: TagAdmin | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'used_by_employee_id' })
  used_by_employee: Employee | null;
}
