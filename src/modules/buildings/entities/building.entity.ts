import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Floor } from './floor.entity';
import { Zone } from './zone.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class Building {
  @PrimaryGeneratedColumn()
  building_id: number;

  @Column({ length: COLUMN_LENGTHS.TITLE })
  title: string;

  @Column({ length: COLUMN_LENGTHS.ADDRESS, nullable: true })
  address: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Organization, (organization) => organization.buildings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => Floor, (floor) => floor.building)
  floors: Floor[];

  @OneToMany(() => Zone, (zone) => zone.building)
  zones: Zone[];
}
