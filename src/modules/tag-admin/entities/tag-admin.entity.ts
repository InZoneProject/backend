import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TagAssignment } from './tag-assignment.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';
import { PasswordReset } from '../../auth/entities/password-reset.entity';

@Entity()
export class TagAdmin {
  @PrimaryGeneratedColumn()
  tag_admin_id: number;

  @Column({
    type: 'varchar',
    length: COLUMN_LENGTHS.FULL_NAME,
  })
  full_name: string;

  @Column({
    type: 'varchar',
    unique: true,
    length: COLUMN_LENGTHS.EMAIL,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: COLUMN_LENGTHS.PASSWORD,
  })
  password: string;

  @Column({
    type: 'varchar',
    length: COLUMN_LENGTHS.PHONE,
    nullable: true,
  })
  phone: string | null;

  @Column({
    type: 'varchar',
    length: COLUMN_LENGTHS.PHOTO,
    nullable: true,
  })
  photo: string | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  is_email_verified: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Organization, (organization) => organization.tag_admins, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => TagAssignment, (tag_assignment) => tag_assignment.tag_admin)
  tag_assignments: TagAssignment[];

  @OneToMany(() => PasswordReset, (passwordReset) => passwordReset.tag_admin)
  password_resets: PasswordReset[];
}
