import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class Position {
  @PrimaryGeneratedColumn()
  position_id: number;

  @Column({ length: COLUMN_LENGTHS.ROLE })
  role: string;

  @Column({
    type: 'varchar',
    length: COLUMN_LENGTHS.DESCRIPTION,
    nullable: true,
  })
  description: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Organization, (organization) => organization.positions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
