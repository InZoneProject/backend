import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TagAssignment } from './tag-assignment.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class TagAdmin {
  @PrimaryGeneratedColumn()
  tag_admin_id: number;

  @Column({ length: COLUMN_LENGTHS.FULL_NAME })
  full_name: string;

  @Column({ unique: true, length: COLUMN_LENGTHS.EMAIL })
  email: string;

  @Column({ length: COLUMN_LENGTHS.PASSWORD })
  password: string;

  @Column({ length: COLUMN_LENGTHS.PHONE, nullable: true })
  phone: string;

  @Column({ length: COLUMN_LENGTHS.PHOTO, nullable: true })
  photo: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => TagAssignment, (tag_assignment) => tag_assignment.tag_admin)
  tag_assignments: TagAssignment[];
}
