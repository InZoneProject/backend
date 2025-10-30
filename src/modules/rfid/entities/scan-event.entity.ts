import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RfidTag } from './rfid-tag.entity';
import { RfidReader } from './rfid-reader.entity';

@Entity()
export class ScanEvent {
  @PrimaryGeneratedColumn()
  scan_event_id: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => RfidTag, (rfid_tag) => rfid_tag.scan_events, {
    onDelete: 'SET NULL',
  })
  rfid_tag: RfidTag;

  @ManyToOne(() => RfidReader, (rfid_reader) => rfid_reader.scan_events, {
    onDelete: 'SET NULL',
  })
  rfid_reader: RfidReader;
}
