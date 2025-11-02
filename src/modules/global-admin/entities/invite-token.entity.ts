import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrganizationAdmin } from '../../organizations/entities/organization-admin.entity';

@Entity()
export class InviteToken {
  @PrimaryGeneratedColumn()
  invite_token_id: number;

  @Column({ type: 'text', unique: true })
  token_encrypted: string;

  @Column({ default: false })
  is_used: boolean;

  @Column({ type: 'timestamp', nullable: true })
  used_at: Date;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => OrganizationAdmin, { nullable: true })
  @JoinColumn({ name: 'used_by' })
  used_by: OrganizationAdmin;
}
