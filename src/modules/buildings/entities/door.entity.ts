import {
  Column,
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

  @Column({ default: false })
  is_entrance: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => RfidReader, {
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  rfid_reader: RfidReader;

  @ManyToOne(() => Zone, (zone_from) => zone_from.outgoing_doors, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'zone_from_id' })
  zone_from: Zone | null;

  @ManyToOne(() => Zone, (zone_to) => zone_to.incoming_doors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'zone_to_id' })
  zone_to: Zone;
}
