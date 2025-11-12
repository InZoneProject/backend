import {
  CreateDateColumn,
  Entity,
  JoinColumn,
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
  @JoinColumn({ name: 'rfid_tag_id' })
  rfid_tag: RfidTag;

  @ManyToOne(() => RfidReader, (rfid_reader) => rfid_reader.scan_events, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'rfid_reader_id' })
  rfid_reader: RfidReader;
}
