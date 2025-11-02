import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Notification } from '../../notifications/entities/notification.entity';
import { TagAssignment } from '../../tag-admin/entities/tag-assignment.entity';
import { Position } from '../../organizations/entities/position.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class Employee {
  @PrimaryGeneratedColumn()
  employee_id: number;

  @Column({ length: COLUMN_LENGTHS.FULL_NAME })
  full_name: string;

  @Column({ unique: true, length: COLUMN_LENGTHS.EMAIL })
  email: string;

  @Column({ length: COLUMN_LENGTHS.PASSWORD, nullable: true })
  password: string;

  @Column({ length: COLUMN_LENGTHS.PHONE, nullable: true })
  phone: string;

  @Column({ length: COLUMN_LENGTHS.PHOTO, nullable: true })
  photo: string;

  @Column({ default: false })
  is_consent_given: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Notification, (notification) => notification.employee, {
    cascade: true,
  })
  notifications: Notification[];

  @OneToMany(() => TagAssignment, (tag_assignment) => tag_assignment.employee)
  tag_assignments: TagAssignment[];

  @ManyToMany(() => Position)
  @JoinTable()
  positions: Position[];

  @ManyToOne(() => Organization, (organization) => organization.employees, {
    onDelete: 'SET NULL',
  })
  organization: Organization;
}
