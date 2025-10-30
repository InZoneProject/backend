import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { COLUMN_LENGTHS } from '../constants/column-lengths';

@Entity()
export class GlobalAdmin {
  @PrimaryGeneratedColumn()
  global_admin_id: number;

  @Column({ unique: true, length: COLUMN_LENGTHS.EMAIL })
  email: string;

  @Column({ length: COLUMN_LENGTHS.PASSWORD })
  password: string;
}
