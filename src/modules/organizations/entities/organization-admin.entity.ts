import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

@Entity()
export class OrganizationAdmin {
  @PrimaryGeneratedColumn()
  organization_admin_id: number;

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

  @Column({ default: false })
  is_email_verified: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(
    () => Organization,
    (organization) => organization.organization_admin,
  )
  organizations: Organization[];
}
