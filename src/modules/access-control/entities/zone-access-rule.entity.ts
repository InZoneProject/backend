import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccessType } from '../../../shared/enums/access-type.enum';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class ZoneAccessRule {
  @PrimaryGeneratedColumn()
  zone_access_rule_id: number;

  @Column({ length: COLUMN_LENGTHS.TITLE })
  title: string;

  @Column({ type: 'enum', enum: AccessType })
  access_type: AccessType;

  @Column({ nullable: true })
  max_duration_minutes: number;

  @CreateDateColumn()
  created_at: Date;
}
