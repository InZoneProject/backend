import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Door } from './door.entity';
import { ZoneAccessRule } from '../../access-control/entities/zone-access-rule.entity';
import { Floor } from './floor.entity';
import { Building } from './building.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class Zone {
  @PrimaryGeneratedColumn()
  zone_id: number;

  @Column({ length: COLUMN_LENGTHS.TITLE })
  title: string;

  @Column({ default: false })
  is_transition_between_floors: boolean;

  @Column({ default: 10 })
  width: number;

  @Column({ default: 10 })
  height: number;

  @Column({ length: COLUMN_LENGTHS.PHOTO })
  photo: string;

  @Column()
  x_coordinate: number;

  @Column()
  y_coordinate: number;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Door, (door) => door.zone_from)
  outgoing_doors: Door[];

  @OneToMany(() => Door, (door) => door.zone_to)
  incoming_doors: Door[];

  @ManyToMany(() => ZoneAccessRule)
  @JoinTable()
  zone_access_rules: ZoneAccessRule[];

  @ManyToOne(() => Floor, (floor) => floor.zones, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'floor_id' })
  floor: Floor | null;

  @ManyToOne(() => Building, (building) => building.zones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'building_id' })
  building: Building;
}
