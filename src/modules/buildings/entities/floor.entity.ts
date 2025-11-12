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

@Entity()
export class Floor {
  @PrimaryGeneratedColumn()
  floor_id: number;

  @Column()
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
}
