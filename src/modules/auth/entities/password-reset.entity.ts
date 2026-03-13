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

@Entity()
export class PasswordReset {
  @PrimaryGeneratedColumn()
  password_reset_id: number;

  @Column()
  token_hashed: string;

  @Column()
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => OrganizationAdmin, (admin) => admin.password_resets, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_admin_id' })
  organization_admin: OrganizationAdmin | null;

  @ManyToOne(() => TagAdmin, (admin) => admin.password_resets, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_admin_id' })
  tag_admin: TagAdmin | null;

  @ManyToOne(() => Employee, (employee) => employee.password_resets, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee | null;
}
