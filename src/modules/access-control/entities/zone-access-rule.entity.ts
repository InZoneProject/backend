import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccessType } from '../../../shared/enums/access-type.enum';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity()
export class ZoneAccessRule {
  @PrimaryGeneratedColumn()
  zone_access_rule_id: number;

  @Column({ length: COLUMN_LENGTHS.TITLE })
  title: string;

  @Column({ type: 'enum', enum: AccessType })
  access_type: AccessType;

  @Column({ type: 'int', nullable: true })
  max_duration_minutes: number | null;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @CreateDateColumn()
  created_at: Date;
}
