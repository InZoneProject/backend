import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Door } from './door.entity';
import { Floor } from './floor.entity';
import { Building } from './building.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';
import { DEFAULT_VALUES } from '../../../shared/constants/default-structure.constants';

@Entity()
export class Zone {
  @PrimaryGeneratedColumn()
  zone_id: number;

  @Column({ length: COLUMN_LENGTHS.TITLE, default: DEFAULT_VALUES.ZONE_TITLE })
  title: string;

  @Column({ default: false })
  is_transition_between_floors: boolean;

  @Column({ default: DEFAULT_VALUES.ZONE_WIDTH })
  width: number;

  @Column({ default: DEFAULT_VALUES.ZONE_HEIGHT })
  height: number;

  @Column({ type: 'varchar', length: COLUMN_LENGTHS.PHOTO, nullable: true })
  photo: string | null;

  @Column({ default: DEFAULT_VALUES.ZONE_X_COORDINATE })
  x_coordinate: number;

  @Column({ default: DEFAULT_VALUES.ZONE_Y_COORDINATE })
  y_coordinate: number;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Door, (door) => door.zone_from)
  outgoing_doors: Door[];

  @OneToMany(() => Door, (door) => door.zone_to)
  incoming_doors: Door[];

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
