import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RfidReader } from '../../rfid/entities/rfid-reader.entity';
import { Zone } from './zone.entity';

@Entity()
export class Door {
  @PrimaryGeneratedColumn()
  door_id: number;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => RfidReader, {
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  rfid_reader: RfidReader;

  @ManyToOne(() => Zone, (zone_from) => zone_from.outgoing_doors, {
    onDelete: 'CASCADE',
  })
  zone_from: Zone;

  @ManyToOne(() => Zone, (zone_to) => zone_to.incoming_doors, {
    onDelete: 'CASCADE',
  })
  zone_to: Zone;
}
