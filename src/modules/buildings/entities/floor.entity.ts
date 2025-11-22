import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Building } from './building.entity';
import { Zone } from './zone.entity';
import { Door } from './door.entity';
import { DEFAULT_VALUES } from '../../../shared/constants/default-structure.constants';

@Entity()
export class Floor {
  @PrimaryGeneratedColumn()
  floor_id: number;

  @Column({ default: DEFAULT_VALUES.FLOOR_NUMBER })
  floor_number: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Building, (building) => building.floors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'building_id' })
  building: Building;

  @OneToMany(() => Zone, (zone) => zone.floor, {
    cascade: true,
  })
  zones: Zone[];

  @OneToMany(() => Door, (door) => door.floor, {
    cascade: true,
  })
  doors: Door[];
}
