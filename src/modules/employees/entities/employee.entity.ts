import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Notification } from '../../notifications/entities/notification.entity';
import { TagAssignment } from '../../tag-admin/entities/tag-assignment.entity';
import { Position } from '../../organizations/entities/position.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';
import { PasswordReset } from '../../auth/entities/password-reset.entity';

@Entity()
export class Employee {
  @PrimaryGeneratedColumn()
  employee_id: number;

  @Column({
    type: 'varchar',
    length: COLUMN_LENGTHS.FULL_NAME,
  })
  full_name: string;

  @Column({
    type: 'varchar',
    unique: true,
    length: COLUMN_LENGTHS.EMAIL,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: COLUMN_LENGTHS.PASSWORD,
    nullable: true,
  })
  password: string | null;

  @Column({
    type: 'varchar',
    length: COLUMN_LENGTHS.PHONE,
    nullable: true,
  })
  phone: string | null;

  @Column({
    type: 'varchar',
    length: COLUMN_LENGTHS.PHOTO,
    nullable: true,
  })
  photo: string | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  is_consent_given: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  is_email_verified: boolean;

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

  @ManyToMany(() => Organization, (organization) => organization.employees)
  @JoinTable()
  organizations: Organization[];

  @OneToMany(() => PasswordReset, (passwordReset) => passwordReset.employee)
  password_resets: PasswordReset[];
}
