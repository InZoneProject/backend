import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Zone } from '../../buildings/entities/zone.entity';
import { ZoneAccessRule } from './zone-access-rule.entity';
import { Position } from '../../organizations/entities/position.entity';

@Entity()
@Unique(['zone', 'zone_access_rule'])
export class ZoneRuleAssignment {
  @PrimaryGeneratedColumn()
  zone_rule_assignment_id: number;

  @ManyToOne(() => Zone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @ManyToOne(() => ZoneAccessRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_access_rule_id' })
  zone_access_rule: ZoneAccessRule;

  @ManyToMany(() => Position)
  @JoinTable()
  positions: Position[];

  @CreateDateColumn()
  created_at: Date;
}
