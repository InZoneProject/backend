import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { Zone } from '../../buildings/entities/zone.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  notification_id: number;

  @Column({ length: COLUMN_LENGTHS.TITLE })
  title: string;

  @Column({ length: COLUMN_LENGTHS.MESSAGE })
  message: string;

  @Column({ default: false })
  is_read_by_employee: boolean;

  @Column({ default: false })
  is_read_by_org_admin: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Employee, (employee) => employee.notifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Zone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;
}
