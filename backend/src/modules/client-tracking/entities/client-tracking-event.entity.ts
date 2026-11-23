import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OccupancyClientLink } from './occupancy-client-link.entity';

export type TrackingEventType =
  | 'checkin'
  | 'limit_reached'
  | 'closing_60'
  | 'closing_15'
  | 'night_started'
  | 'checkout';

/**
 * Avisos internos del cliente, persistidos. `dedupe_key` único garantiza que
 * cada aviso se genere una sola vez (también con varias instancias o tras reconectar).
 */
@Entity('client_tracking_events')
export class ClientTrackingEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'link_id', type: 'uuid' })
  linkId!: string;

  @ManyToOne(() => OccupancyClientLink, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'link_id' })
  link!: OccupancyClientLink;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'occupancy_id', type: 'uuid' })
  occupancyId!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: TrackingEventType;

  @Index({ unique: true })
  @Column({ name: 'dedupe_key', type: 'varchar', length: 200 })
  dedupeKey!: string;

  @Column({ type: 'varchar', length: 300 })
  message!: string;

  @Column({ type: 'jsonb', default: {} })
  data!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
