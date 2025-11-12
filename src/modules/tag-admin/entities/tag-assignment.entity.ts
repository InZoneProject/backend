import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { TagAdmin } from './tag-admin.entity';
import { RfidTag } from '../../rfid/entities/rfid-tag.entity';

@Entity()
export class TagAssignment {
  @PrimaryGeneratedColumn()
  tag_assignment_id: number;

  @Column()
  tag_assignment_change_date_and_time: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Employee, (employee) => employee.tag_assignments, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => TagAdmin, (tag_admin) => tag_admin.tag_assignments, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'tag_admin_id' })
  tag_admin: TagAdmin;

  @ManyToOne(() => RfidTag, (rfid_tag) => rfid_tag.tag_assignments, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'rfid_tag_id' })
  rfid_tag: RfidTag;
}
