import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
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
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Employee, (employee) => employee.notifications, {
    onDelete: 'CASCADE',
  })
  employee: Employee;
}
