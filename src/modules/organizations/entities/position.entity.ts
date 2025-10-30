import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ZoneAccessRule } from '../../access-control/entities/zone-access-rule.entity';
import { Organization } from './organization.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class Position {
  @PrimaryGeneratedColumn()
  position_id: number;

  @Column({ length: COLUMN_LENGTHS.ROLE })
  role: string;

  @Column({ length: COLUMN_LENGTHS.DESCRIPTION, nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToMany(() => ZoneAccessRule)
  @JoinTable()
  zone_access_rules: ZoneAccessRule[];

  @ManyToOne(() => Organization, (organization) => organization.positions, {
    onDelete: 'CASCADE',
  })
  organization: Organization;
}
