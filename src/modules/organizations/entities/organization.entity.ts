import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Position } from './position.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { RfidTag } from '../../rfid/entities/rfid-tag.entity';
import { RfidReader } from '../../rfid/entities/rfid-reader.entity';
import { OrganizationAdmin } from './organization-admin.entity';
import { Building } from '../../buildings/entities/building.entity';
import { TagAdmin } from '../../tag-admin/entities/tag-admin.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';
import { ZoneAccessRule } from '../../access-control/entities/zone-access-rule.entity';

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

  @ManyToMany(() => Employee, (employee) => employee.organizations)
  employees: Employee[];

  @OneToMany(() => RfidTag, (rfid_tag) => rfid_tag.organization, {
    cascade: true,
  })
  rfid_tags: RfidTag[];

  @OneToMany(() => RfidReader, (rfid_reader) => rfid_reader.organization, {
    cascade: true,
  })
  rfid_readers: RfidReader[];

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

  @OneToMany(
    () => ZoneAccessRule,
    (zone_access_rule) => zone_access_rule.organization,
  )
  zone_access_rules: ZoneAccessRule[];
}
