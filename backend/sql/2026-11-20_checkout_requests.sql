-- Feature: Checkout por QR con identificación automática + métodos de pago (EstacionApp)
--
-- En desarrollo la tabla la crea TypeORM (synchronize: true) a partir de
-- src/modules/occupancy/checkout/entities/checkout-request.entity.ts.
-- Este script es el respaldo para entornos sin synchronize. Es idempotente y
-- SOLO crea objetos nuevos: no altera ni borra tablas existentes.
--
-- Uso:  psql -h <host> -U <user> -d <db> -f sql/2026-11-20_checkout_requests.sql
-- Antes: pg_dump -Fc -d <db> -f backup_antes_de_checkout.dump

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Solicitud de salida pagando en efectivo (egreso pendiente de confirmación del personal).
-- El estado del pago sigue en `payments`; el de la estadía en `occupancies.is_completed`.
CREATE TABLE IF NOT EXISTS checkout_requests (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  occupancy_id         uuid NOT NULL REFERENCES occupancies(id) ON DELETE CASCADE,
  parking_lot_id       uuid NOT NULL,
  user_id              uuid NOT NULL,
  method               varchar(10) NOT NULL,           -- CASH
  status               varchar(20) NOT NULL,           -- PENDING | COMPLETED_PAID | COMPLETED_UNPAID | COMPLETED_WALLET | CANCELLED
  quoted_amount_cents  bigint NOT NULL,
  vehicle_plate        varchar(15) NULL,
  resolved_by_user_id  uuid NULL,
  resolved_at          timestamptz NULL,
  payment_id           uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CHK_checkout_requests_quoted" CHECK (quoted_amount_cents >= 0)
);

-- Una sola solicitud pendiente por estadía
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_checkout_requests_pending_occupancy"
  ON checkout_requests (occupancy_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS "IDX_checkout_requests_lot_status" ON checkout_requests (parking_lot_id, status);
CREATE INDEX IF NOT EXISTS "IDX_checkout_requests_user"       ON checkout_requests (user_id, created_at);

COMMIT;
