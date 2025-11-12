import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationAdmin } from '../../organizations/entities/organization-admin.entity';
import { TagAdmin } from '../../tag-admin/entities/tag-admin.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class EmailVerification {
  @PrimaryGeneratedColumn('uuid')
  verification_id: string;

  @Column({ length: COLUMN_LENGTHS.VERIFICATION_CODE })
  code: string;

  @Column()
  expires_at: Date;

  @ManyToOne(() => OrganizationAdmin, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_admin_id' })
  organization_admin: OrganizationAdmin | null;

  @ManyToOne(() => TagAdmin, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_admin_id' })
  tag_admin: TagAdmin | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee | null;

  @CreateDateColumn()
  created_at: Date;
}
