import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TagAssignment } from '../../tag-admin/entities/tag-assignment.entity';
import { ScanEvent } from './scan-event.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity()
export class RfidTag {
  @PrimaryGeneratedColumn()
  rfid_tag_id: number;

  @Column({ unique: true })
  serial_id: number;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => TagAssignment, (tag_assignment) => tag_assignment.rfid_tag)
  tag_assignments: TagAssignment[];

  @OneToMany(() => ScanEvent, (scan_event) => scan_event.rfid_tag)
  scan_events: ScanEvent[];

  @ManyToOne(() => Organization, (organization) => organization.rfid_tags, {
    onDelete: 'CASCADE',
  })
  organization: Organization;
}
