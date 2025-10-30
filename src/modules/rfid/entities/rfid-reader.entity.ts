import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ScanEvent } from './scan-event.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class RfidReader {
  @PrimaryGeneratedColumn()
  rfid_reader_id: number;

  @Column({ length: COLUMN_LENGTHS.SECRET_TOKEN })
  secret_token: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => ScanEvent, (scan_event) => scan_event.rfid_reader)
  scan_events: ScanEvent[];
}
