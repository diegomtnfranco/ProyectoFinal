-- Feature: Billetera demo + Mercado Pago Sandbox (EstacionApp)
--
-- En desarrollo estas tablas las crea TypeORM (synchronize: true) a partir de
-- las entidades de src/modules/payments/entities. Este script es el respaldo
-- para entornos sin synchronize. Es idempotente y SOLO crea objetos nuevos:
-- no altera ni borra tablas existentes.
--
-- Uso:  psql -h <host> -U <user> -d <db> -f sql/2026-11-18_wallet_payments.sql
-- Antes: pg_dump -Fc -d <db> -f backup_antes_de_pagos.dump

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS wallets (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  balance_cents      bigint NOT NULL DEFAULT 0,
  currency           varchar(3) NOT NULL DEFAULT 'ARS',
  total_loaded_cents bigint NOT NULL DEFAULT 0,
  total_spent_cents  bigint NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_wallets_user" UNIQUE (user_id),
  CONSTRAINT "CHK_wallets_balance_nonneg" CHECK (balance_cents >= 0)
);

CREATE TABLE IF NOT EXISTS payments (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payer_user_id          uuid NULL,
  parking_lot_id         uuid NOT NULL REFERENCES parking_lots(id) ON DELETE RESTRICT,
  obligation_type        varchar(12) NOT NULL,
  reservation_id         uuid NULL,
  occupancy_id           uuid NULL,
  obligation_key         varchar(60) NOT NULL,
  vehicle_plate          varchar(15) NULL,
  concept                varchar(200) NOT NULL,
  billed_amount_cents    bigint NOT NULL,
  covered_amount_cents   bigint NOT NULL DEFAULT 0,
  amount_cents           bigint NOT NULL,
  currency               varchar(3) NOT NULL DEFAULT 'ARS',
  method                 varchar(20) NOT NULL,
  status                 varchar(12) NOT NULL,
  status_detail          varchar(80) NULL,
  external_payment_id    varchar(40) NULL,
  external_preference_id varchar(80) NULL,
  checkout_url           varchar(500) NULL,
  expires_at             timestamptz NULL,
  approved_at            timestamptz NULL,
  registered_by_user_id  uuid NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CHK_payments_amount_positive" CHECK (amount_cents > 0),
  CONSTRAINT "CHK_payments_obligation_ref" CHECK (
    (obligation_type = 'RESERVATION' AND reservation_id IS NOT NULL) OR
    (obligation_type = 'OCCUPANCY' AND occupancy_id IS NOT NULL))
);

-- Una sola operación activa (PENDING) o aprobada por obligación: evita cobros duplicados
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payments_active_obligation"
  ON payments (obligation_key) WHERE status IN ('PENDING', 'APPROVED');
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payments_external_payment"
  ON payments (external_payment_id) WHERE external_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "IDX_payments_lot_approved"   ON payments (parking_lot_id, approved_at);
CREATE INDEX IF NOT EXISTS "IDX_payments_payer_created"  ON payments (payer_user_id, created_at);
CREATE INDEX IF NOT EXISTS "IDX_payments_occupancy"      ON payments (occupancy_id);
CREATE INDEX IF NOT EXISTS "IDX_payments_reservation"    ON payments (reservation_id);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id           uuid NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  type                varchar(6) NOT NULL,
  kind                varchar(20) NOT NULL,
  amount_cents        bigint NOT NULL,
  balance_after_cents bigint NOT NULL,
  description         varchar(200) NOT NULL,
  payment_id          uuid NULL,
  idempotency_key     varchar(80) NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CHK_wallet_tx_amount_positive" CHECK (amount_cents > 0),
  CONSTRAINT "CHK_wallet_tx_balance_nonneg" CHECK (balance_after_cents >= 0)
);
CREATE INDEX IF NOT EXISTS "IDX_wallet_tx_wallet_created" ON wallet_transactions (wallet_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_wallet_tx_idempotency"
  ON wallet_transactions (wallet_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_events (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id uuid NULL,
  source     varchar(20) NOT NULL,
  event      varchar(60) NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_payment_events_payment" ON payment_events (payment_id, created_at);

COMMIT;

-- Verificación de consistencia (debe devolver 0 filas):
-- SELECT w.id, w.balance_cents,
--        SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount_cents ELSE -t.amount_cents END) AS ledger
--   FROM wallets w LEFT JOIN wallet_transactions t ON t.wallet_id = w.id
--  GROUP BY w.id HAVING w.balance_cents <> COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount_cents ELSE -t.amount_cents END), 0);
