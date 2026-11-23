import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Una fila por destinatario: la lectura de un usuario no afecta a otro.
 * dedupe_key + user_id único = un mismo evento no se notifica dos veces.
 * Independiente de reservas, ocupación y movimientos (solo referencias opcionales).
 */
@Entity('user_notifications')
@Unique('UQ_user_notification_dedupe', ['userId', 'dedupeKey'])
@Index('IDX_user_notifications_user_created', ['userId', 'createdAt'])
@Index('IDX_user_notifications_unread', ['userId'], {
  where: 'read_at IS NULL',
})
export class UserNotification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 40 })
  type!: string;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 500 })
  message!: string;

  /** Información contextual (sin datos sensibles innecesarios) */
  @Column({ type: 'jsonb', default: {} })
  data!: Record<string, unknown>;

  /** Ruta del frontend para navegar (informativa, nunca ejecuta acciones) */
  @Column({ type: 'varchar', length: 200, nullable: true })
  link!: string | null;

  @Column({
    name: 'related_entity_type',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  relatedEntityType!: string | null;

  @Column({ name: 'related_entity_id', type: 'uuid', nullable: true })
  relatedEntityId!: string | null;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 200 })
  dedupeKey!: string;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @Index('IDX_user_notifications_expires')
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;
}
