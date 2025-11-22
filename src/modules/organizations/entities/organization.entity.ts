import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Position } from './position.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { RfidTag } from '../../rfid/entities/rfid-tag.entity';
import { OrganizationAdmin } from './organization-admin.entity';
import { Building } from '../../buildings/entities/building.entity';
import { TagAdmin } from '../../tag-admin/entities/tag-admin.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class Organization {
  @PrimaryGeneratedColumn()
  organization_id: number;

  @Column({ length: COLUMN_LENGTHS.TITLE })
  title: string;

  @Column({ length: COLUMN_LENGTHS.DESCRIPTION, nullable: true })
  description: string;

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
  @JoinColumn({ name: 'organization_admin_id' })
  organization_admin: OrganizationAdmin;

  @OneToMany(() => Building, (building) => building.organization, {
    cascade: true,
  })
  buildings: Building[];

  @OneToMany(() => TagAdmin, (tag_admin) => tag_admin.organization)
  tag_admins: TagAdmin[];
}
