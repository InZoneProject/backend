import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';
import { PasswordReset } from '../../auth/entities/password-reset.entity';

@Entity()
export class OrganizationAdmin {
  @PrimaryGeneratedColumn()
  organization_admin_id: number;

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

  @OneToMany(
    () => Organization,
    (organization) => organization.organization_admin,
  )
  organizations: Organization[];

  @OneToMany(
    () => PasswordReset,
    (passwordReset) => passwordReset.organization_admin,
  )
  password_resets: PasswordReset[];
}
