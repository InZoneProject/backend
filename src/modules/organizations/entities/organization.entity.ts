import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Position } from './position.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { RfidTag } from '../../rfid/entities/rfid-tag.entity';
import { OrganizationAdmin } from './organization-admin.entity';
import { Building } from '../../buildings/entities/building.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class Organization {
  @PrimaryGeneratedColumn()
  organization_id: number;

  @Column({ length: COLUMN_LENGTHS.TITLE })
  title: string;

  @Column({ length: COLUMN_LENGTHS.DESCRIPTION, nullable: true })
  description: string;

  @Column({ type: 'time' })
  work_day_start_time: string;

  @Column({ type: 'time' })
  work_day_end_time: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Position, (position) => position.organization, {
    cascade: true,
  })
  positions: Position[];

  @OneToMany(() => Employee, (employee) => employee.organization)
  employees: Employee[];

  @OneToMany(() => RfidTag, (rfid_tag) => rfid_tag.organization, {
    cascade: true,
  })
  rfid_tags: RfidTag[];

  @ManyToOne(
    () => OrganizationAdmin,
    (organization_admin) => organization_admin.organizations,
    {
      onDelete: 'CASCADE',
    },
  )
  organization_admin: OrganizationAdmin;

  @OneToMany(() => Building, (building) => building.organization, {
    cascade: true,
  })
  buildings: Building[];
}
