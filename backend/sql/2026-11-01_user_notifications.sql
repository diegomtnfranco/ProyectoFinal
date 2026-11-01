-- EstacionApp · Centro de notificaciones (feature user-notifications)
-- En desarrollo estas tablas las crea TypeORM (synchronize: true, configuración existente).
-- Este script es para entornos sin synchronize. Es idempotente: solo crea estructuras nuevas
-- y no modifica tablas ni datos existentes.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS user_notifications (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                varchar(40)  NOT NULL,
  title               varchar(120) NOT NULL,
  message             varchar(500) NOT NULL,
  data                jsonb        NOT NULL DEFAULT '{}'::jsonb,
  link                varchar(200),
  related_entity_type varchar(40),
  related_entity_id   uuid,
  dedupe_key          varchar(200) NOT NULL,
  read_at             timestamp,
  created_at          timestamp    NOT NULL DEFAULT now(),
  expires_at          timestamp    NOT NULL,
  CONSTRAINT "UQ_user_notification_dedupe" UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS "IDX_user_notifications_user_created" ON user_notifications (user_id, created_at);
CREATE INDEX IF NOT EXISTS "IDX_user_notifications_unread" ON user_notifications (user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS "IDX_user_notifications_expires" ON user_notifications (expires_at);

CREATE TABLE IF NOT EXISTS occupancy_alert_subscriptions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parking_lot_id   uuid NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
  is_active        boolean   NOT NULL DEFAULT true,
  activated_at     timestamp NOT NULL,
  last_notified_at timestamp,
  created_at       timestamp NOT NULL DEFAULT now(),
  updated_at       timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_occupancy_alert_user_lot" UNIQUE (user_id, parking_lot_id)
);
CREATE INDEX IF NOT EXISTS "IDX_occupancy_alert_subscriptions_lot" ON occupancy_alert_subscriptions (parking_lot_id);

CREATE TABLE IF NOT EXISTS parking_availability_states (
  parking_lot_id   uuid PRIMARY KEY REFERENCES parking_lots(id) ON DELETE CASCADE,
  state            varchar(10) NOT NULL,
  full_since       timestamp,
  last_notified_at timestamp,
  updated_at       timestamp NOT NULL
);
