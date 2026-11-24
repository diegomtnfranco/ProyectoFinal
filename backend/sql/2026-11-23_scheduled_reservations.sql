-- Feature: Reservas programadas (Clientes: Sistema de Reservas)
--
-- En desarrollo las columnas las crea TypeORM (synchronize: true) a partir de
-- src/modules/reservations/entities/reservation.entity.ts.
-- Este script es el respaldo para entornos sin synchronize. Es idempotente y
-- SOLO agrega columnas nuevas: no altera ni borra datos existentes.
--
-- Uso:  psql -h <host> -U <user> -d <db> -f sql/2026-11-23_scheduled_reservations.sql

BEGIN;

-- true cuando la reserva se hizo con >= 24 h de anticipación (tarifa diferencial)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_scheduled boolean NOT NULL DEFAULT false;
-- importe sin descuento (horas x tarifa)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS base_amount numeric(10,2) NULL;
-- % de descuento aplicado (0 si no es programada)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) NULL;

-- El % de descuento por estacionamiento vive en parking_lots.settings (jsonb):
--   settings->>'scheduledReservationDiscountPercent'  (si falta, el backend usa 10)

COMMIT;
